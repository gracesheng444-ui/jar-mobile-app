import { computeStarSize, computeVisualCapacity, SizingConfig } from 'jar-core-logic';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { Star } from './Star';

const SIZING: SizingConfig = { baseSize: 30, minSize: 10 };
const MAX_RENDERED_STARS = 200;

interface StarJarProps {
  starCount: number;
  estimatedDaysApart?: number;
}

export function StarJar({ starCount, estimatedDaysApart }: StarJarProps) {
  const visualCapacity = computeVisualCapacity(estimatedDaysApart);
  const starSize = computeStarSize(starCount, visualCapacity, SIZING);
  const rendered = Math.min(starCount, MAX_RENDERED_STARS);

  // Only the most-recently-added star plays the pop-in animation, so re-renders
  // (e.g. from the size-shrink recalculation) don't replay it for every star.
  const prevCountRef = useRef(starCount);
  const grewThisRender = starCount > prevCountRef.current;
  prevCountRef.current = starCount;

  return (
    <View style={styles.scene}>
      <Svg width="100%" height="100%" viewBox="0 0 220 300" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="backdrop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1B1526" />
            <Stop offset="1" stopColor="#332119" />
          </LinearGradient>
          <RadialGradient id="vignette" cx="50%" cy="45%" r="65%">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.45} />
          </RadialGradient>
          <RadialGradient id="bokehWarm" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFC978" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FFC978" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bokehCool" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8FD8FF" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#8FD8FF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>

          {/* Oxidized dark-bronze gradient: darker and less shiny than polished brass, matching an antiqued filigree lid. */}
          <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#140D07" />
            <Stop offset="0.14" stopColor="#3D2C18" />
            <Stop offset="0.3" stopColor="#8A6A3C" />
            <Stop offset="0.42" stopColor="#4E3A20" />
            <Stop offset="0.55" stopColor="#251A0E" />
            <Stop offset="0.68" stopColor="#4E3A20" />
            <Stop offset="0.82" stopColor="#9C7A46" />
            <Stop offset="0.92" stopColor="#3D2C18" />
            <Stop offset="1" stopColor="#140D07" />
          </LinearGradient>
          <RadialGradient id="finial" cx="35%" cy="30%" r="70%">
            <Stop offset="0" stopColor="#C9A76B" />
            <Stop offset="0.5" stopColor="#7A5B30" />
            <Stop offset="1" stopColor="#251A0E" />
          </RadialGradient>
          {/* Warm light glowing through the lid's cutwork holes */}
          <RadialGradient id="filigreeGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF6E0" stopOpacity={1} />
            <Stop offset="0.7" stopColor="#FFCB6B" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#FFA940" stopOpacity={0.55} />
          </RadialGradient>

          <LinearGradient id="jarGlass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF3DD" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#FFD79A" stopOpacity={0.13} />
          </LinearGradient>
          <RadialGradient id="innerGlow" cx="50%" cy="80%" r="55%">
            <Stop offset="0" stopColor="#FFD98A" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FFD98A" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Cozy dark backdrop with soft bokeh and a vignette for depth, instead of flat color */}
        <Path d="M0 0 H220 V300 H0 Z" fill="url(#backdrop)" />
        <Circle cx={34} cy={70} r={30} fill="url(#bokehWarm)" />
        <Circle cx={192} cy={230} r={26} fill="url(#bokehCool)" />
        <Circle cx={196} cy={54} r={16} fill="url(#bokehWarm)" />
        <Path d="M0 0 H220 V300 H0 Z" fill="url(#vignette)" />

        {/* Ground shadow beneath the jar for weight */}
        <Circle cx={110} cy={272} r={70} fill="url(#groundShadow)" />

        {/* Twine bow around the neck, with a hanging tag */}
        <Path d="M64 44 Q78 58 64 72" fill="none" stroke="#7A5B30" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M156 44 Q142 58 156 72" fill="none" stroke="#7A5B30" strokeWidth={1.5} strokeLinecap="round" />
        <Circle cx={110} cy={58} r={3} fill="#7A5B30" />
        <Path d="M150 62 L172 84" stroke="#7A5B30" strokeWidth={1} />
        <Path d="M170 80 L192 76 L196 96 L174 100 Z" fill="#EADFC8" stroke="#7A5B30" strokeWidth={1} />
        <Circle cx={176} cy={86} r={1.4} fill="#7A5B30" />

        {/* Lid: oxidized dome with a scalloped cutwork rim, filigree holes glowing from the light inside, and a ball finial */}
        <Path d="M92 20 V12 H100 V20" fill="none" stroke="#251A0E" strokeWidth={2} />
        <Circle cx={96} cy={16} r={3} fill="none" stroke="#251A0E" strokeWidth={1} />
        <Circle cx={96} cy={9} r={5.5} fill="url(#finial)" stroke="#140D07" strokeWidth={0.75} />
        <Path d="M58 44 Q58 24 110 24 Q162 24 162 44 Z" fill="url(#metal)" stroke="#140D07" strokeWidth={1.25} />
        {/* Scalloped lace-like rim along the base of the dome */}
        <Path
          d="M58 44 q6.5 5.5 13 0 q6.5 5.5 13 0 q6.5 5.5 13 0 q6.5 5.5 13 0 q6.5 5.5 13 0 q6.5 5.5 13 0 q6.5 5.5 13 0 q6.5 5.5 13 0"
          fill="none"
          stroke="#140D07"
          strokeWidth={1}
        />
        {/* Scalloped garland linking the filigree holes, like engraved lacework */}
        <Path d="M62 33 Q76 41 90 33 Q104 41 118 33 Q132 41 146 33 Q160 41 166 34" fill="none" stroke="#B98936" strokeWidth={1} opacity={0.7} />
        {/* Filigree cutwork: bold holes with warm light glowing through, clear at a glance */}
        {[
          { x: 62, y: 33, r: 3 },
          { x: 90, y: 33, r: 3.2 },
          { x: 118, y: 33, r: 3.2 },
          { x: 146, y: 33, r: 3.2 },
          { x: 166, y: 34, r: 2.6 },
        ].map((hole, i) => (
          <Circle key={i} cx={hole.x} cy={hole.y} r={hole.r} fill="url(#filigreeGlow)" stroke="#FFF3D6" strokeWidth={0.4} />
        ))}

        {/* Jar body */}
        <Path
          d="M58 44 H162 V70 Q196 82 196 128 V232 Q196 270 158 270 H62 Q24 270 24 232 V128 Q24 82 58 70 Z"
          fill="url(#jarGlass)"
          stroke="url(#metal)"
          strokeWidth={1.75}
        />
        <Path
          d="M58 44 H162 V70 Q196 82 196 128 V232 Q196 270 158 270 H62 Q24 270 24 232 V128 Q24 82 58 70 Z"
          fill="url(#innerGlow)"
        />

        {/* Glass shine: a bright thin highlight plus a softer wide one, for a more dimensional curve */}
        <Path d="M42 92 Q35 180 46 252" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.4} />
        <Path d="M52 96 Q47 180 55 248" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" opacity={0.1} />
      </Svg>
      <View style={styles.starWrap}>
        {rendered === 0 ? (
          <Text style={styles.emptyText}>No stars yet — complete a cycle together to fold the first one.</Text>
        ) : (
          Array.from({ length: rendered }).map((_, i) => (
            <Star key={i} size={starSize} colorIndex={i} isNew={grewThisRender && i === rendered - 1} />
          ))
        )}
      </View>
      {starCount > MAX_RENDERED_STARS && <Text style={styles.overflowText}>+{starCount - MAX_RENDERED_STARS} more</Text>}
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
    overflow: 'hidden',
  },
  starWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
    paddingTop: 90,
  },
  emptyText: { textAlign: 'center', color: '#EADFC8', fontSize: 13, marginTop: 60, paddingHorizontal: 20 },
  overflowText: { textAlign: 'center', color: '#EADFC8', fontSize: 12, marginTop: 4 },
});
