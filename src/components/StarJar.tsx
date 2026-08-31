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

          {/* Multi-band metallic gradient: alternating light/dark bands read as a curved reflective surface. */}
          <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#4A3316" />
            <Stop offset="0.12" stopColor="#8C6328" />
            <Stop offset="0.28" stopColor="#EAD39B" />
            <Stop offset="0.4" stopColor="#B98936" />
            <Stop offset="0.52" stopColor="#6E4B1E" />
            <Stop offset="0.64" stopColor="#B98936" />
            <Stop offset="0.78" stopColor="#F3E2B4" />
            <Stop offset="0.9" stopColor="#8C6328" />
            <Stop offset="1" stopColor="#4A3316" />
          </LinearGradient>
          <RadialGradient id="finial" cx="35%" cy="30%" r="70%">
            <Stop offset="0" stopColor="#F6E8C4" />
            <Stop offset="0.5" stopColor="#C89A4C" />
            <Stop offset="1" stopColor="#6E4B1E" />
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
        <Path d="M64 44 Q78 58 64 72" fill="none" stroke="#9C7644" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M156 44 Q142 58 156 72" fill="none" stroke="#9C7644" strokeWidth={1.5} strokeLinecap="round" />
        <Circle cx={110} cy={58} r={3} fill="#9C7644" />
        <Path d="M150 62 L172 84" stroke="#9C7644" strokeWidth={1} />
        <Path d="M170 80 L192 76 L196 96 L174 100 Z" fill="#EADFC8" stroke="#9C7644" strokeWidth={1} />
        <Circle cx={176} cy={86} r={1.4} fill="#9C7644" />

        {/* Lid: brushed-metal dome with a polished finial, engraved ring instead of plain dots */}
        <Path d="M92 20 V12 H100 V20" fill="none" stroke="#6E4B1E" strokeWidth={2} />
        <Circle cx={96} cy={9} r={5.5} fill="url(#finial)" stroke="#6E4B1E" strokeWidth={0.75} />
        <Path d="M58 44 Q58 24 110 24 Q162 24 162 44 Z" fill="url(#metal)" stroke="#4A3316" strokeWidth={1.25} />
        <Path d="M62 40 Q110 30 158 40" fill="none" stroke="#4A3316" strokeWidth={0.75} opacity={0.5} />

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
