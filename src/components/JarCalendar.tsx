import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { CycleWithNotes, fetchJarCycles } from '../supabase/api';
import { CREAM_BORDER, CREAM_FIELD, GOLD, INK, MUTED } from '../theme';

interface JarCalendarProps {
  jarId: string;
  colorA: string;
  colorB: string;
  selfRole: 'A' | 'B';
  partnerName: string;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Month-grid history view of every cycle a jar has had — each day's dots mirror the same
 *  bright/dim tap-status language already used on the "My Jars" list. Cycles are pure rolling
 *  24h UTC from jar creation, not midnight-aligned (see jar-core-logic), so pinning a cycle to
 *  "the calendar day its cycleStartUTC falls in" (device-local time) is an approximation — for a
 *  once-a-day cadence it lands on the day a person would actually call it almost every time. */
export function JarCalendar({ jarId, colorA, colorB, selfRole, partnerName }: JarCalendarProps) {
  const { t, language } = useI18n();
  const [cycles, setCycles] = useState<CycleWithNotes[] | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<{ date: Date; cycle: CycleWithNotes } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCycles(null);
    void fetchJarCycles(jarId).then((fetched) => {
      if (!cancelled) setCycles(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [jarId]);

  const cyclesByDate = useMemo(() => {
    const map = new Map<string, CycleWithNotes>();
    const todayKey = localDateKey(new Date());
    for (const c of cycles ?? []) {
      // A still-active cycle (open, or sitting in an unresolved grace period) always belongs
      // under today's cell regardless of its cycleStartUTC's calendar date — a cycle in grace
      // is, by definition, at least 24h old already, so its start almost always falls on
      // yesterday (or earlier) even though it's the cycle a person actually means by "today."
      const key = c.status === 'open' || c.status === 'incomplete_grace' ? todayKey : localDateKey(c.cycleStartUTC);
      map.set(key, c);
    }
    return map;
  }, [cycles]);

  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const monthLabel = viewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdayLabels = useMemo(() => {
    const aSunday = new Date(2026, 0, 4);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(aSunday.getFullYear(), aSunday.getMonth(), aSunday.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'narrow' });
    });
  }, [locale]);

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = new Array(firstOfMonth.getDay()).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewMonth]);

  const changeMonth = (delta: number) => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const today = localDateKey(new Date());

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={10} style={styles.arrowButton}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={styles.arrowButton}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekdayLabels.map((w, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      {cycles === null ? (
        <Text style={styles.loadingText}>{t.calendar.loading}</Text>
      ) : (
        weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => {
              const cycle = date ? cyclesByDate.get(localDateKey(date)) : undefined;
              const isToday = date ? localDateKey(date) === today : false;
              return (
                <Pressable
                  key={di}
                  disabled={!date || !cycle}
                  onPress={() => date && cycle && setSelectedDay({ date, cycle })}
                  style={[styles.dayCell, isToday && styles.dayCellToday, cycle?.status === 'repaired' && styles.dayCellRepaired]}
                >
                  {date && (
                    <>
                      <Text style={styles.dayNumber}>{date.getDate()}</Text>
                      {cycle && (
                        <View style={styles.dotsRow}>
                          <View style={[styles.dot, { backgroundColor: colorA }, !cycle.userATapped && styles.dotDim]} />
                          <View style={[styles.dot, { backgroundColor: colorB }, !cycle.userBTapped && styles.dotDim]} />
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))
      )}

      <View style={styles.legend}>
        <LegendRow swatchStyle={styles.legendDotsDim} label={t.calendar.legendMissed} />
        <LegendRow swatchStyle={styles.legendRingToday} label={t.calendar.legendToday} />
        <LegendRow swatchStyle={styles.legendRingRepaired} label={t.calendar.legendRepaired} />
      </View>

      {selectedDay && (
        <DayDetailOverlay
          date={selectedDay.date}
          cycle={selectedDay.cycle}
          selfRole={selfRole}
          partnerName={partnerName}
          locale={locale}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </View>
  );
}

function DayDetailOverlay({
  date,
  cycle,
  selfRole,
  partnerName,
  locale,
  onClose,
}: {
  date: Date;
  cycle: CycleWithNotes;
  selfRole: 'A' | 'B';
  partnerName: string;
  locale: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const selfNote = selfRole === 'A' ? cycle.userANote : cycle.userBNote;
  const partnerNote = selfRole === 'A' ? cycle.userBNote : cycle.userANote;
  const dateLabel = date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.overlayCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.overlayDate}>{dateLabel}</Text>
          <View style={styles.overlayNotes}>
            <Text style={styles.overlayNoteRow}>
              <Text style={styles.overlayNoteLabel}>{t.memory.meLabel}: </Text>
              {selfNote ?? t.calendar.dayModalNoNote}
            </Text>
            <Text style={styles.overlayNoteRow}>
              <Text style={styles.overlayNoteLabel}>{partnerName}: </Text>
              {partnerNote ?? t.calendar.dayModalNoNote}
            </Text>
          </View>
          <Pressable style={styles.overlayCloseButton} onPress={onClose}>
            <Text style={styles.overlayCloseText}>{t.calendar.close}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LegendRow({ swatchStyle, label }: { swatchStyle: object; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, swatchStyle]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 10 },
  arrowButton: { padding: 4 },
  arrow: { fontSize: 20, fontWeight: '700', color: INK },
  monthLabel: { fontSize: 15, fontWeight: '800', color: INK, minWidth: 130, textAlign: 'center' },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4 },
  loadingText: { textAlign: 'center', color: MUTED, fontSize: 13, marginVertical: 20 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  dayCellToday: { borderWidth: 1.5, borderColor: GOLD },
  dayCellRepaired: { backgroundColor: '#EAF6EE' },
  dayNumber: { fontSize: 11, color: INK, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 3, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: INK },
  dotDim: { opacity: 0.25 },
  legend: { marginTop: 14, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendSwatch: { width: 16, height: 16, borderRadius: 8 },
  legendDotsDim: { backgroundColor: GOLD, opacity: 0.25 },
  legendRingToday: { borderWidth: 1.5, borderColor: GOLD, backgroundColor: CREAM_FIELD },
  legendRingRepaired: { backgroundColor: '#EAF6EE', borderWidth: 1, borderColor: CREAM_BORDER },
  legendText: { fontSize: 12, color: MUTED },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    minWidth: 260,
    maxWidth: 340,
  },
  overlayDate: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 14, textAlign: 'center' },
  overlayNotes: { gap: 10, marginBottom: 16 },
  overlayNoteRow: { fontSize: 14, color: INK, lineHeight: 20 },
  overlayNoteLabel: { fontWeight: '700' },
  overlayCloseButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: CREAM_FIELD, borderWidth: 1, borderColor: CREAM_BORDER },
  overlayCloseText: { fontWeight: '700', color: INK, fontSize: 14 },
});
