"""Explore stable and unstable explicit solutions of Fick's second law."""

# Requires: python -m pip install numpy matplotlib
import numpy as np
import matplotlib.pyplot as plt


# Physical domain and constant diffusivity
L = 100e-6  # m
D = 1e-12  # m^2 s^-1
NODES = 101
dx = L / NODES
x = -L / 2 + (np.arange(NODES) + 0.5) * dx

# Step initial condition: low concentration | high concentration
concentration = np.where(x < 0.0, 0.0, 1.0)
initial_concentration = concentration.copy()

# Explicit stability: Fo = D*dt/dx^2 must not exceed 1/2 in 1D.
# Change this to 0.55 and rerun to reveal numerical instability.
FOURIER = 0.45
dt = FOURIER * dx**2 / D
TARGET_TAU = 0.08  # tau = D*t/L^2
target_time = TARGET_TAU * L**2 / D
elapsed = 0.0
iterations = 0
diverged = False
PLOT_MIN, PLOT_MAX = -2.0, 3.0

while elapsed < target_time:
    step_dt = min(dt, target_time - elapsed)
    # Face fluxes. The two boundary faces remain zero (no flux).
    flux = np.zeros(NODES + 1)
    flux[1:NODES] = -D * np.diff(concentration) / dx

    # Conservative balance: what leaves one cell enters the next.
    concentration -= (step_dt / dx) * (flux[1:] - flux[:-1])
    elapsed += step_dt
    iterations += 1

    if (
        not np.all(np.isfinite(concentration))
        or concentration.min() < PLOT_MIN
        or concentration.max() > PLOT_MAX
    ):
        diverged = True
        break

print(f"Fo = {FOURIER:.2f}")
print("Predicted behavior:", "stable" if FOURIER <= 0.5 else "unstable")
print(
    "Mass retained = "
    f"{concentration.sum() / initial_concentration.sum():.12f}"
)
print(
    "Concentration range = "
    f"[{concentration.min():.4f}, {concentration.max():.4f}]"
)
if diverged:
    print(f"Stopped after {iterations} increments: nonphysical oscillations left the plot range.")

plt.plot(x * 1e6, initial_concentration, "--", label="initial")
plt.plot(x * 1e6, concentration, label="finite difference")
plt.xlabel("Position (micrometres)")
plt.ylabel("Normalized concentration")
plt.axhspan(0, 1, color="tab:green", alpha=0.06, label="physical range")
plt.ylim((PLOT_MIN, PLOT_MAX) if FOURIER > 0.5 else (-0.03, 1.03))
plt.legend()
plt.tight_layout()
plt.show()
