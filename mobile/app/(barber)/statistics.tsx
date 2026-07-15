import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  TrendingUp,
  Users,
  Star,
  Download,
  BarChart3,
  Scissors,
  ChevronDown,
} from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { Popover, PopoverMenu, useAnchor } from '@/components/ui/Popover';

// ─── Types + mock data ────────────────────────────────────────────────────────

type Period = 'month' | 'year' | 'all';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS  = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

const DATA: Record<Period, {
  totalBookings: number; totalEarnings: number; avgRating: number; newClients: number;
  chartData: number[]; chartLabels: string[];
  topServices: { name: string; count: number }[];
  topStaff: { name: string; bookings: number }[];
}> = {
  month: {
    totalBookings: 48, totalEarnings: 2860, avgRating: 4.8, newClients: 12,
    chartData: [320, 480, 260, 540, 410, 390, 480],
    chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    topServices: [{ name: 'Executive Fade', count: 18 }, { name: 'Haircut & Beard', count: 14 }, { name: 'Beard Trim', count: 9 }],
    topStaff: [{ name: 'You (Owner)', bookings: 24 }, { name: 'Kwame Mensah', bookings: 22 }, { name: 'Kofi Asare', bookings: 16 }, { name: 'Ama Boateng', bookings: 10 }],
  },
  year: {
    totalBookings: 412, totalEarnings: 24800, avgRating: 4.7, newClients: 98,
    chartData: [1800, 2100, 2400, 1950, 2200, 2800, 2600, 2400, 1900, 2100, 2300, 2500],
    chartLabels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
    topServices: [{ name: 'Executive Fade', count: 142 }, { name: 'Haircut & Beard', count: 118 }, { name: 'Beard Trim', count: 89 }],
    topStaff: [{ name: 'You (Owner)', bookings: 195 }, { name: 'Kwame Mensah', bookings: 180 }, { name: 'Kofi Asare', bookings: 142 }, { name: 'Ama Boateng', bookings: 90 }],
  },
  all: {
    totalBookings: 1240, totalEarnings: 78500, avgRating: 4.7, newClients: 310,
    chartData: [3200, 4100, 5200, 4800, 6200, 7100, 6800],
    chartLabels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    topServices: [{ name: 'Executive Fade', count: 480 }, { name: 'Haircut & Beard', count: 390 }, { name: 'Beard Trim', count: 280 }],
    topStaff: [{ name: 'You (Owner)', bookings: 610 }, { name: 'Kwame Mensah', bookings: 540 }, { name: 'Kofi Asare', bookings: 420 }, { name: 'Ama Boateng', bookings: 280 }],
  },
};

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data, labels, c }: { data: number[]; labels: string[]; c: ThemeColors }) {
  const { width } = useWindowDimensions();
  const W = width - 48, H = 160, PADL = 36, PADB = 28;
  const maxVal = Math.max(...data);
  const barW = (W - PADL) / data.length - 4;
  const maxIdx = data.indexOf(maxVal);

  return (
    <Svg width={W} height={H + PADB}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <Line key={pct} x1={PADL} y1={H - H * pct} x2={W} y2={H - H * pct} stroke={c.border} strokeWidth={1} />
      ))}
      {data.map((val, i) => {
        const barH = (val / maxVal) * H;
        const x = PADL + i * ((W - PADL) / data.length) + 2;
        return <Rect key={i} x={x} y={H - barH} width={barW} height={barH} rx={4} fill={i === maxIdx ? c.accent : c.accentSoft} />;
      })}
      {labels.map((lbl, i) => (
        <SvgText key={i} x={PADL + i * ((W - PADL) / data.length) + barW / 2 + 2} y={H + PADB - 4} textAnchor="middle" fontSize={10} fill={c.textFaint} fontWeight="600">
          {lbl}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ icon, label, value, color, c }: { icon: React.ReactNode; label: string; value: string; color: string; c: ThemeColors }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        {icon}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: c.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 2, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [period, setPeriod] = useState<Period>('month');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear,  setSelectedYear]  = useState(String(now.getFullYear()));

  const monthPop = useAnchor();
  const yearPop  = useAnchor();

  const d = DATA[period];

  async function exportCSV() {
    const rows = [
      'Metric,Value',
      `Total Bookings,${d.totalBookings}`,
      `Total Earnings (GHS),${d.totalEarnings}`,
      `Average Rating,${d.avgRating}`,
      `New Clients,${d.newClients}`,
      '',
      'Top Services,Bookings',
      ...d.topServices.map((s) => `${s.name},${s.count}`),
      '',
      'Top Staff,Bookings',
      ...d.topStaff.map((s) => `${s.name},${s.bookings}`),
    ].join('\n');
    await Share.share({ message: rows, title: `Trimova_Stats_${period}.csv` });
  }

  const cardStyle = {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 14,
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Statistics</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Track your business performance</Text>
        </View>
        <Pressable onPress={exportCSV} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Download size={17} color={c.accent} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Period tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 3, marginBottom: 16 }}>
          {/* Month tab */}
          <Pressable
            ref={monthPop.ref}
            onPress={() => { setPeriod('month'); yearPop.close(); monthPop.open(); }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: period === 'month' ? c.surface : 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: period === 'month' ? c.text : c.textFaint }}>
              {period === 'month' ? selectedMonth : 'Month'}
            </Text>
            <ChevronDown size={12} color={period === 'month' ? c.textMuted : c.textFaint} />
          </Pressable>

          {/* Year tab */}
          <Pressable
            ref={yearPop.ref}
            onPress={() => { setPeriod('year'); monthPop.close(); yearPop.open(); }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: period === 'year' ? c.surface : 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: period === 'year' ? c.text : c.textFaint }}>
              {period === 'year' ? selectedYear : 'Year'}
            </Text>
            <ChevronDown size={12} color={period === 'year' ? c.textMuted : c.textFaint} />
          </Pressable>

          {/* All Time tab */}
          <Pressable
            onPress={() => { setPeriod('all'); monthPop.close(); yearPop.close(); }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: period === 'all' ? c.surface : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: period === 'all' ? c.text : c.textFaint }}>All Time</Text>
          </Pressable>
        </View>

        {/* KPI grid */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <KPICard c={c} icon={<BarChart3 size={16} color={c.accent} />} label="Bookings" value={String(d.totalBookings)} color={c.accent} />
          <KPICard c={c} icon={<TrendingUp size={16} color={c.success} />} label="Earnings" value={`₵${d.totalEarnings.toLocaleString()}`} color={c.success} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <KPICard c={c} icon={<Star size={16} color={c.warning} />} label="Avg Rating" value={String(d.avgRating)} color={c.warning} />
          <KPICard c={c} icon={<Users size={16} color="#9333EA" />} label="New Clients" value={String(d.newClients)} color="#9333EA" />
        </View>

        {/* Bar chart */}
        <View style={cardStyle}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 12 }}>Revenue Trend (GHS)</Text>
          <BarChart data={d.chartData} labels={d.chartLabels} c={c} />
        </View>

        {/* Top services */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Scissors size={15} color={c.accent} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>Top 3 Services</Text>
          </View>
          {d.topServices.map((s, i) => {
            const maxCount = d.topServices[0].count;
            return (
              <View key={s.name} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: i === 0 ? c.accent : c.textFaint, width: 18 }}>#{i + 1}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{s.name}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: c.accent }}>{s.count}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: c.surfaceAlt, borderRadius: 3 }}>
                  <View style={{ width: `${(s.count / maxCount) * 100}%`, height: '100%', backgroundColor: i === 0 ? c.accent : c.accentSoft, borderRadius: 3 }} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Top staff */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Users size={15} color={c.accent} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>All Barbers — Shop Overview</Text>
          </View>
          {d.topStaff.map((s, i) => {
            const initials = s.name.split(' ').map((n) => n[0]).join('').toUpperCase();
            return (
              <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.textFaint, width: 18 }}>#{i + 1}</Text>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{initials}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.text }}>{s.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>{s.bookings}</Text>
              </View>
            );
          })}
        </View>

        {/* Export */}
        <Pressable onPress={exportCSV} style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Download size={17} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Download Report (.CSV)</Text>
        </Pressable>
      </ScrollView>

      {/* Floating month popover */}
      <Popover anchor={monthPop.anchor} onClose={monthPop.close} width={160}>
        <PopoverMenu
          options={MONTHS.map((m) => ({ label: m, value: m }))}
          selected={selectedMonth}
          onSelect={(m) => { setSelectedMonth(m); setPeriod('month'); monthPop.close(); }}
        />
      </Popover>

      {/* Floating year popover */}
      <Popover anchor={yearPop.anchor} onClose={yearPop.close} width={140}>
        <PopoverMenu
          options={YEARS.map((y) => ({ label: String(y), value: String(y) }))}
          selected={selectedYear}
          onSelect={(y) => { setSelectedYear(y); setPeriod('year'); yearPop.close(); }}
        />
      </Popover>
    </View>
  );
}
