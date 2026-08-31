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
            <Stop offset="0" stopColor="#241A38" />
            <Stop offset="1" stopColor="#402C24" />
          </LinearGradient>
          <RadialGradient id="bokehWarm" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFC978" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFC978" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bokehCool" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8FD8FF" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#8FD8FF" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="jarGlass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF3DD" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FFD79A" stopOpacity={0.16} />
          </LinearGradient>
          <RadialGradient id="innerGlow" cx="50%" cy="78%" r="55%">
            <Stop offset="0" stopColor="#FFD98A" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFD98A" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="jarLid" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8A5A2B" />
            <Stop offset="0.5" stopColor="#E8B767" />
            <Stop offset="1" stopColor="#8A5A2B" />
          </LinearGradient>
        </Defs>

        {/* Cozy dark backdrop, evoking a dim room, with a couple of soft warm/cool bokeh lights */}
        <Path d="M0 0 H220 V300 H0 Z" fill="url(#backdrop)" />
        <Circle cx={34} cy={70} r={30} fill="url(#bokehWarm)" />
        <Circle cx={192} cy={230} r={26} fill="url(#bokehCool)" />
        <Circle cx={196} cy={54} r={16} fill="url(#bokehWarm)" />

        {/* Twine bow around the neck, with a hanging tag */}
        <Path d="M64 44 Q78 58 64 72" fill="none" stroke="#B98B57" strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M156 44 Q142 58 156 72" fill="none" stroke="#B98B57" strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={110} cy={58} r={4} fill="#B98B57" />
        <Path d="M150 62 L172 84" stroke="#B98B57" strokeWidth={1.5} />
        <Path d="M170 80 L192 76 L196 96 L174 100 Z" fill="#EADFC8" stroke="#B98B57" strokeWidth={1.5} />
        <Circle cx={176} cy={86} r={1.6} fill="#B98B57" />

        {/* Lid: dome with a ball finial and a row of studs suggesting filigree */}
        <Path d="M92 20 V12 H100 V20" fill="none" stroke="#8A5A2B" strokeWidth={2.5} />
        <Circle cx={96} cy={10} r={5} fill="url(#jarLid)" stroke="#8A5A2B" strokeWidth={1.5} />
        <Path d="M58 44 Q58 24 110 24 Q162 24 162 44 Z" fill="url(#jarLid)" stroke="#8A5A2B" strokeWidth={2.5} />
        {[74, 92, 110, 128, 146].map((x) => (
          <Circle key={x} cx={x} cy={40} r={1.8} fill="#8A5A2B" opacity={0.6} />
        ))}

        {/* Jar body */}
        <Path
          d="M58 44 H162 V70 Q196 82 196 128 V232 Q196 270 158 270 H62 Q24 270 24 232 V128 Q24 82 58 70 Z"
          fill="url(#jarGlass)"
          stroke="#E8B767"
          strokeWidth={2.5}
        />
        <Path
          d="M58 44 H162 V70 Q196 82 196 128 V232 Q196 270 158 270 H62 Q24 270 24 232 V128 Q24 82 58 70 Z"
          fill="url(#innerGlow)"
        />

        {/* Glass shine */}
        <Path d="M44 96 Q37 180 48 250" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.22} />
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
