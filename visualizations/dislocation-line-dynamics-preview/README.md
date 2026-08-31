# Dislocation line dynamics preview

This standalone page compares two kinds of solver data without treating them as equivalent:

- **TU Graz ParaDiS ensemble:** six independent relaxed configurations selected by total-line-length quantile from a 300-configuration archive. These states are not a time series.
- **OpenDiS/PyDiS Frank–Read trajectory:** twenty time-ordered JSON snapshots written every ten steps during the official 200-step pure-Python example.

The page is integrated as Section 02 of the Work in Progress `teaching/dislocations/` module while retaining this standalone URL for full-page use.

## Source data

The ParaDiS configurations come from Satyapriya Gupta, *Making sense of dislocation correlations – ParaDis data files*, Graz University of Technology (2022), DOI [`10.3217/an3jq-cdm10`](https://doi.org/10.3217/an3jq-cdm10), CC BY 4.0. The downloaded archive MD5 is `86cdcd5294fda49656af1fc60df8ae46`.

The Frank–Read frames were generated from the [OpenDiS/PyDiS example](https://github.com/OpenDiS/OpenDiS/tree/main/examples/02_frank_read_src) at commit `ef31c6d0d89c05dc4cb7d7bada83cea4539a10a8`, BSD-3-Clause. The unmodified example used a fixed applied stress component of `-4.0e8 Pa`, a line-tension force model, `SimpleGlide` mobility, Euler integration, collision handling, and length-based remeshing.

## Regenerating the browser data

After downloading and unpacking the TU Graz archive and running the PyDiS example, run:

```text
python tools/prepare_data.py \
  --tugraz-dir /path/to/relaxed_data_files \
  --frank-read-dir /path/to/02_frank_read_src/output \
  --output data/dislocation-data.json
```

The converter applies the periodic minimum-image convention, deduplicates reciprocal ParaDiS arms, preserves node constraints and connectivity, and stores enough information to duplicate line pieces across periodic faces. The TU Graz restart archive does not contain `.ctrl` boundary flags, so the conversion records the explicit assumption that these cubic single-slip cells are fully periodic. The browser colors segments using `abs(tangent · burgers_unit)`.

Only the saved ten-step PyDiS snapshots are solver states. The browser linearly interpolates persistent node positions and collapses or grows changed topology between adjacent outputs to make playback legible; discrete counts and graph markers remain snapped to the nearest saved state.

Serve the repository over HTTP; opening `index.html` directly with `file://` will prevent the JSON fetch.
