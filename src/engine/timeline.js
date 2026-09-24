/**
 * Small dependency-free sequencer for scripted comedy beats (camera
 * reframes, confetti burst -> abrupt stop, staggered text overlays,
 * orbit/fly-away choreography). Deliberately not a full animation
 * framework -- the specific hard-cut "record scratch mid-animation"
 * choreography this game needs is easier to write directly than to
 * bend a general timeline library to fit.
 */
export class Timeline {
  constructor(steps = []) {
    this.steps = steps;
    this.t = 0;
    this.i = 0;
    this._done = false;
  }

  /** Add a step that fires once `at` seconds have elapsed. */
  at(atSeconds, run) {
    this.steps.push({ at: atSeconds, run });
    this.steps.sort((a, b) => a.at - b.at);
    return this;
  }

  update(dt) {
    if (this._done) return;
    this.t += dt;
    while (this.i < this.steps.length && this.t >= this.steps[this.i].at) {
      this.steps[this.i].run();
      this.i++;
    }
    if (this.i >= this.steps.length) this._done = true;
  }

  get done() {
    return this._done;
  }

  cancel() {
    this._done = true;
    this.i = this.steps.length;
  }
}

/** Simple numeric/property tween helper for one-off lerps outside a Timeline. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
