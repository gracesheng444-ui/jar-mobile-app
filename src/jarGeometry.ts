// Single source of truth for the jar illustration's interior in RN layout
// units (StarJar's `scene` box, 240x320) — derived from the jar body path's
// own SVG viewBox coordinates (220x300, a different unit system), so the
// star-sizing math and the star-placement algorithm can never drift apart
// the way padding numbers guessed independently in two files already have
// twice this session.
const SCENE_WIDTH = 240;
const SCENE_HEIGHT = 320;
const VIEWBOX_WIDTH = 220;
const VIEWBOX_HEIGHT = 300;
const SCALE_X = SCENE_WIDTH / VIEWBOX_WIDTH;
const SCALE_Y = SCENE_HEIGHT / VIEWBOX_HEIGHT;

// Body path's straight sides (x) and flat floor (y), in viewBox units — see
// StarJar.tsx's body path. Half the ink stroke width (3.4) is subtracted so
// these land on the *inner* edge of the drawn line, not its centerline.
const STROKE_HALF_VIEWBOX = 3.4 / 2;
const BODY_LEFT_VIEWBOX = 16 + STROKE_HALF_VIEWBOX;
const BODY_RIGHT_VIEWBOX = 204 - STROKE_HALF_VIEWBOX;
const BODY_FLOOR_VIEWBOX = 274 - STROKE_HALF_VIEWBOX;

/** Inner-left wall, in RN units — stars can rest right up against this. */
export const JAR_LEFT = BODY_LEFT_VIEWBOX * SCALE_X;
/** Inner-right wall, in RN units. */
export const JAR_RIGHT = BODY_RIGHT_VIEWBOX * SCALE_X;
/** Inner floor line, in RN units — a star's bottom edge belongs here, not past it. */
export const JAR_FLOOR_Y = BODY_FLOOR_VIEWBOX * SCALE_Y;
/** Roughly where the ruffle's lowest dips end — stars filling above this start crowding the lid. */
export const JAR_FILL_TOP_Y = 100;

export const JAR_USABLE_WIDTH = JAR_RIGHT - JAR_LEFT;
export const JAR_USABLE_HEIGHT = JAR_FLOOR_Y - JAR_FILL_TOP_Y;
