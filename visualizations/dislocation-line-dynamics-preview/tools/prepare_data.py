#!/usr/bin/env python3
"""Prepare compact browser data from TU Graz ParaDiS and OpenDiS JSON files.

The TU Graz archive contains an ensemble of independent relaxed configurations,
not a time series. Six configurations spanning the total-line-length distribution
are selected for the lecture viewer. The OpenDiS files are retained as a true
time-ordered Frank--Read trajectory.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path


FLOAT = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"
PRIMARY_RE = re.compile(
    rf"^\s*(\d+)\s*,\s*(\d+)\s+({FLOAT})\s+({FLOAT})\s+({FLOAT})\s+(\d+)\s+(-?\d+)\s*$"
)
ARM_RE = re.compile(
    rf"^\s*(\d+)\s*,\s*(\d+)\s+({FLOAT})\s+({FLOAT})\s+({FLOAT})\s*$"
)


def rounded(value: float) -> float:
    return round(value, 6)


def vector_length(vector: list[float]) -> float:
    return math.sqrt(sum(component * component for component in vector))


def next_content_line(lines: list[str], index: int) -> tuple[str, int]:
    while index < len(lines):
        line = lines[index].strip()
        index += 1
        if line and not line.startswith("#"):
            return line, index
    raise ValueError("Unexpected end of ParaDiS file")


def bracket_vector(lines: list[str], key: str) -> list[float]:
    start = next(i for i, line in enumerate(lines) if line.strip().startswith(key))
    values: list[float] = []
    index = start + 1
    while index < len(lines) and len(values) < 3:
        line = lines[index].strip()
        index += 1
        if line == "]":
            break
        values.extend(float(value) for value in re.findall(FLOAT, line))
    if len(values) != 3:
        raise ValueError(f"Could not read {key} from ParaDiS file")
    return values


def canonical_tag(tag: tuple[int, int]) -> str:
    return f"{tag[0]}:{tag[1]}"


def normalized_position(
    position: list[float], mins: list[float], lengths: list[float], periodic: list[bool]
) -> list[float]:
    output = []
    for axis in range(3):
        value = 2.0 * (position[axis] - mins[axis]) / lengths[axis] - 1.0
        if periodic[axis]:
            value = (value + 1.0) % 2.0 - 1.0
        value = rounded(value)
        if periodic[axis] and value >= 1.0:
            value = -1.0
        output.append(value)
    return output


def periodic_shift(
    first: list[float], second: list[float], lengths: list[float], periodic: list[bool]
) -> tuple[list[float], list[float]]:
    shifts: list[float] = []
    deltas: list[float] = []
    for axis in range(3):
        delta = second[axis] - first[axis]
        image = round(delta / lengths[axis]) if periodic[axis] else 0
        delta -= image * lengths[axis]
        deltas.append(delta)
        shifts.append(float(-2 * image))
    return shifts, deltas


def parse_paradis(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    mins = bracket_vector(lines, "minCoordinates")
    maxs = bracket_vector(lines, "maxCoordinates")
    lengths = [maxs[i] - mins[i] for i in range(3)]
    periodic = [True, True, True]
    nodal_index = next(i for i, line in enumerate(lines) if line.strip().startswith("nodalData")) + 1

    records: list[dict] = []
    index = nodal_index
    while index < len(lines):
        line, index = next_content_line(lines, index)
        match = PRIMARY_RE.match(line)
        if not match:
            continue
        tag = (int(match.group(1)), int(match.group(2)))
        position = [float(match.group(3)), float(match.group(4)), float(match.group(5))]
        arm_count = int(match.group(6))
        constraint = int(match.group(7))
        arms = []
        for _ in range(arm_count):
            arm_line, index = next_content_line(lines, index)
            arm_match = ARM_RE.match(arm_line)
            if not arm_match:
                raise ValueError(f"Malformed arm line in {path.name}: {arm_line}")
            target = (int(arm_match.group(1)), int(arm_match.group(2)))
            burgers = [float(arm_match.group(3)), float(arm_match.group(4)), float(arm_match.group(5))]
            plane_line, index = next_content_line(lines, index)
            plane = [float(value) for value in re.findall(FLOAT, plane_line)]
            if len(plane) != 3:
                raise ValueError(f"Malformed plane-normal line in {path.name}: {plane_line}")
            arms.append({"target": target, "burgers": burgers, "plane": plane})
        records.append(
            {
                "tag": tag,
                "position": position,
                "constraint": constraint,
                "arms": arms,
            }
        )

    tag_to_index = {record["tag"]: i for i, record in enumerate(records)}
    display_positions = [
        normalized_position(record["position"], mins, lengths, periodic) for record in records
    ]
    unique_segments: dict[tuple[str, str], dict] = {}
    for record in records:
        for arm in record["arms"]:
            if arm["target"] not in tag_to_index:
                continue
            tag_a = canonical_tag(record["tag"])
            tag_b = canonical_tag(arm["target"])
            key = tuple(sorted((tag_a, tag_b)))
            if key in unique_segments:
                continue
            first_tag = record["tag"]
            second_tag = arm["target"]
            burgers = arm["burgers"][:]
            if tag_a != key[0]:
                first_tag, second_tag = second_tag, first_tag
                burgers = [-value for value in burgers]
            first = records[tag_to_index[first_tag]]["position"]
            second = records[tag_to_index[second_tag]]["position"]
            _, delta = periodic_shift(first, second, lengths, periodic)
            first_display = display_positions[tag_to_index[first_tag]]
            second_display = display_positions[tag_to_index[second_tag]]
            shift, _ = periodic_shift(first_display, second_display, [2.0, 2.0, 2.0], periodic)
            unique_segments[key] = {
                "a": tag_to_index[first_tag],
                "b": tag_to_index[second_tag],
                "burgers": burgers,
                "shift": shift,
                "length": vector_length(delta),
            }

    degrees = [0] * len(records)
    for segment in unique_segments.values():
        degrees[segment["a"]] += 1
        degrees[segment["b"]] += 1

    nodes = [
        [
            record["tag"][0],
            record["tag"][1],
            *display_positions[index],
            record["constraint"],
            degrees[index],
        ]
        for index, record in enumerate(records)
    ]
    segments = [
        [
            segment["a"],
            segment["b"],
            *[rounded(value) for value in segment["burgers"]],
            *segment["shift"],
        ]
        for segment in unique_segments.values()
    ]
    total_length = sum(segment["length"] for segment in unique_segments.values())
    reference_length = sum(lengths) / 3.0
    junctions = sum(1 for degree in degrees if degree >= 3)

    return {
        "id": re.search(r"(\d+)", path.stem).group(1),
        "file": path.name,
        "nodes": nodes,
        "segments": segments,
        "stats": {
            "nodes": len(nodes),
            "segments": len(segments),
            "junctions": junctions,
            "lengthOverBox": rounded(total_length / reference_length),
        },
    }


def parse_pydis(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    h = payload["cell"]["h"]
    lengths = [float(h[i][i]) for i in range(3)]
    origin = [float(value) for value in payload["cell"]["origin"]]
    periodic = [bool(value) for value in payload["cell"]["is_periodic"]]
    positions = [[float(value) for value in position] for position in payload["nodes"]["positions"]]
    tags = [tuple(int(value) for value in tag) for tag in payload["nodes"]["tags"]]
    constraints = [int(value[0] if isinstance(value, list) else value) for value in payload["nodes"]["constraints"]]
    mins = origin
    display_positions = [normalized_position(position, mins, lengths, periodic) for position in positions]

    raw_segments = []
    degrees = [0] * len(positions)
    for index, pair in enumerate(payload["segs"]["nodeids"]):
        first_index, second_index = int(pair[0]), int(pair[1])
        first_tag = canonical_tag(tags[first_index])
        second_tag = canonical_tag(tags[second_index])
        burgers = [float(value) for value in payload["segs"]["burgers"][index]]
        if first_tag > second_tag:
            first_index, second_index = second_index, first_index
            first_tag, second_tag = second_tag, first_tag
            burgers = [-value for value in burgers]
        _, delta = periodic_shift(positions[first_index], positions[second_index], lengths, periodic)
        shift, _ = periodic_shift(
            display_positions[first_index], display_positions[second_index], [2.0, 2.0, 2.0], periodic
        )
        raw_segments.append(
            {
                "a": first_index,
                "b": second_index,
                "burgers": burgers,
                "shift": shift,
                "length": vector_length(delta),
            }
        )
        degrees[first_index] += 1
        degrees[second_index] += 1

    nodes = [
        [
            tags[index][0],
            tags[index][1],
            *display_positions[index],
            constraints[index],
            degrees[index],
        ]
        for index, position in enumerate(positions)
    ]
    segments = [
        [
            segment["a"],
            segment["b"],
            *[rounded(value) for value in segment["burgers"]],
            *segment["shift"],
        ]
        for segment in raw_segments
    ]
    match = re.search(r"disnet_(\d+)", path.stem)
    step = int(match.group(1)) if match else 200
    total_length = sum(segment["length"] for segment in raw_segments)
    junctions = sum(1 for degree in degrees if degree >= 3)

    return {
        "step": step,
        "nodes": nodes,
        "segments": segments,
        "stats": {
            "nodes": len(nodes),
            "segments": len(segments),
            "junctions": junctions,
            "pinned": sum(1 for constraint in constraints if constraint == 7),
            "lengthOverBox": rounded(total_length / (sum(lengths) / 3.0)),
        },
    }


def select_quantiles(paths: list[Path]) -> list[tuple[str, Path, float]]:
    labels = [
        "Lowest total-length sample",
        "20th-percentile sample",
        "40th-percentile sample",
        "60th-percentile sample",
        "80th-percentile sample",
        "Highest total-length sample",
    ]
    ranked = []
    for path in paths:
        preview = parse_paradis(path)
        ranked.append((preview["stats"]["lengthOverBox"], path))
    ranked.sort(key=lambda item: (item[0], item[1].name))
    output = []
    for index, label in enumerate(labels):
        quantile = index / (len(labels) - 1)
        ranked_index = round((len(ranked) - 1) * quantile)
        length_over_box, path = ranked[ranked_index]
        output.append((label, path, length_over_box))
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tugraz-dir", type=Path, required=True)
    parser.add_argument("--frank-read-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    tugraz_paths = sorted(args.tugraz_dir.glob("restart_config*.data"))
    if not tugraz_paths:
        raise SystemExit(f"No ParaDiS files found in {args.tugraz_dir}")
    selected = select_quantiles(tugraz_paths)
    ensemble = []
    for label, path, _ in selected:
        parsed = parse_paradis(path)
        parsed["label"] = label
        ensemble.append(parsed)

    frank_paths = sorted(
        args.frank_read_dir.glob("disnet_*.json"),
        key=lambda path: int(re.search(r"(\d+)", path.stem).group(1)),
    )
    if not frank_paths:
        raise SystemExit(f"No OpenDiS snapshots found in {args.frank_read_dir}")
    frank_frames = [parse_pydis(path) for path in frank_paths]

    output = {
        "schema": "mse-dislocation-line-preview/1",
        "generated": "2026-08-31",
        "tugraz": {
            "kind": "ensemble",
            "title": "TU Graz 3-D ParaDiS ensemble",
            "notice": "Independent relaxed configurations; sample order is not simulation time.",
            "source": {
                "title": "Making sense of dislocation correlations - ParaDis data files",
                "creator": "Satyapriya Gupta; contributors Benedikt Weger and Thomas Hochrainer",
                "doi": "10.3217/an3jq-cdm10",
                "url": "https://repository.tugraz.at/records/an3jq-cdm10",
                "license": "CC BY 4.0",
                "archiveMd5": "86cdcd5294fda49656af1fc60df8ae46",
                "archiveConfigurations": 300,
                "periodicityAssumption": "The restart archive does not include .ctrl boundary flags; the converter treats the cubic single-slip cells as fully periodic.",
            },
            "cell": {"min": [-1, -1, -1], "max": [1, 1, 1], "periodic": [True, True, True]},
            "configurations": ensemble,
        },
        "frankRead": {
            "kind": "trajectory",
            "title": "OpenDiS/PyDiS Frank–Read source",
            "notice": "Time-ordered solver output at ten-step intervals; saved step 0 follows the first integration/remesh operation.",
            "source": {
                "project": "OpenDiS",
                "commit": "ef31c6d0d89c05dc4cb7d7bada83cea4539a10a8",
                "url": "https://github.com/OpenDiS/OpenDiS/tree/main/examples/02_frank_read_src",
                "license": "BSD-3-Clause",
                "model": "PyDiS line-tension force, SimpleGlide mobility, Euler integration",
                "appliedStressVoigtPa": [0, 0, 0, 0, -400000000, 0],
                "sigmaXZPa": -400000000,
            },
            "cell": {"min": [-1, -1, -1], "max": [1, 1, 1], "periodic": [True, True, True]},
            "frames": frank_frames,
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {args.output} ({args.output.stat().st_size:,} bytes)")
    print("TU Graz selections:")
    for configuration in ensemble:
        print(
            f"  {configuration['file']}: {configuration['stats']['nodes']} nodes, "
            f"{configuration['stats']['segments']} segments"
        )
    print(f"Frank--Read frames: {len(frank_frames)}")


if __name__ == "__main__":
    main()
