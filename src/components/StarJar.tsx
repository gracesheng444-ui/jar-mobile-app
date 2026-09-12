import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { JAR_CORNER_START_Y, JAR_FLOOR_LEFT, JAR_FLOOR_RIGHT, JAR_FLOOR_Y, JAR_LEFT, JAR_RIGHT } from '../jarGeometry';
import { computeStarPile } from '../starPile';
import { Star } from './Star';

// A pure performance safety net, not a normal-use limit: starSizeForCapacity
// keeps stars shrinking down to its own floor size as capacity grows, so
// ordinary countdowns (even ~year-long ones) fit without ever hitting this.
const MAX_RENDERED_STARS = 500;
const INK = '#2B2118';

interface StarJarProps {
  starCountA: number;
  starCountB: number;
  colorA: string;
  colorB: string;
  /** Countdown mode: fixed once at jar creation, never recalculated. */
  starSize: number;
}

export function StarJar({ starCountA, starCountB, colorA, colorB, starSize }: StarJarProps) {
  const total = starCountA + starCountB;

  // Each user's own count drives its own pop-in, since either partner can tap
  // independently of the other.
  const prevARef = useRef(starCountA);
  const prevBRef = useRef(starCountB);
  const aGrew = starCountA > prevARef.current;
  const bGrew = starCountB > prevBRef.current;
  prevARef.current = starCountA;
  prevBRef.current = starCountB;

  // Interleave the two users' stars (A, B, A, B, ...) instead of two solid
  // blocks, so the jar reads as both partners filling it together.
  const stars: { color: string; isNew: boolean }[] = [];
  const maxEach = Math.max(starCountA, starCountB);
  for (let i = 0; i < maxEach; i++) {
    if (i < starCountA) stars.push({ color: colorA, isNew: aGrew && i === starCountA - 1 });
    if (i < starCountB) stars.push({ color: colorB, isNew: bGrew && i === starCountB - 1 });
  }
  const shown = stars.slice(0, MAX_RENDERED_STARS);

  // Piled up as if actually dropped in one at a time, not laid out in a grid
  // — see starPile.ts. Recomputed each render, but deterministic per index,
  // so already-placed stars never jump around as new ones are added.
  const positions = computeStarPile(shown.length, starSize, {
    left: JAR_LEFT,
    right: JAR_RIGHT,
    floorY: JAR_FLOOR_Y,
    cornerStartY: JAR_CORNER_START_Y,
    floorLeft: JAR_FLOOR_LEFT,
    floorRight: JAR_FLOOR_RIGHT,
  });
  const box = starSize * 1.4;

  return (
    <View style={styles.scene}>
      <Svg width="100%" height="100%" viewBox="0 0 220 300" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Path
          fill="none"
          stroke={INK}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M52,35
             C52,20 78,10 110,9
             C143,8 169,19 169,34
             C169,49 143,52 110,52
             C78,53 52,50 52,35 Z"
        />
        <Path fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" d="M52,42 C46,58 40,66 30,78" />
        <Path fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" d="M169,41 C175,58 181,66 191,78" />
        {/* Wavy cloth-cover ruffle skirt below the lid */}
        <Path
          fill="none"
          stroke={INK}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M30,78
             C15,86 12,98 22,104
             C34,110 42,100 52,98
             C64,96 66,108 80,110
             C94,112 96,100 110,100
             C124,100 126,112 140,110
             C154,108 156,96 168,98
             C178,100 186,110 199,104
             C209,98 206,86 191,78"
        />
        {/* Jar body — wide, rounded belly */}
        <Path
          fill="none"
          stroke={INK}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M36,96
             C18,113 16,132 16,155
             L16,220
             C16,250 26,272 64,274
             L156,274
             C194,272 204,250 204,220
             L204,155
             C204,132 202,113 184,96"
        />
      </Svg>
      {shown.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No stars yet — tap the jar to drop your first one.</Text>
        </View>
      ) : (
        shown.map((s, i) => {
          const pos = positions[i];
          return (
            <View key={i} style={[styles.starSlot, { left: pos.x - box / 2, top: pos.y - box / 2 }]}>
              <Star size={starSize} color={s.color} rotation={pos.rotation} isNew={s.isNew} />
            </View>
          );
        })
      )}
      {total > MAX_RENDERED_STARS && <Text style={styles.overflowText}>+{total - MAX_RENDERED_STARS} more</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: 240,
    height: 320,
    alignSelf: 'center',
    marginVertical: 16,
    borderRadius: 20,
    backgroundColor: '#FDF6EC',
    overflow: 'hidden',
  },
  starSlot: { position: 'absolute' },
  emptyWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', paddingTop: 130, paddingHorizontal: 24 },
  emptyText: { textAlign: 'center', color: '#8A7C68', fontSize: 13 },
  overflowText: { position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#8A7C68', fontSize: 12 },
});
