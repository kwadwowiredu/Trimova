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
} from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText, Path, Circle } from 'react-native-svg';

// ─── Mock data ────────────────────────────────────────────────────────────────

type Period = 'month' | 'year' | 'all';

const DATA = {
  month: {
    totalBookings: 48,
    totalEarnings: 2860,
    avgRating: 4.8,
    newClients: 12,
    chartData: [320, 480, 260, 540, 410, 390, 480],
    chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    topServices: [
      { name: 'Executive Fade', count: 18 },
      { name: 'Haircut & Beard', count: 14 },
      { name: 'Beard Trim', count: 9 },
    ],
    topStaff: [
      { name: 'Kwame Mensah', bookings: 22 },
      { name: 'Kofi Asare', bookings: 16 },
      { name: 'Ama Boateng', bookings: 10 },
    ],
  },
  year: {
    totalBookings: 412,
    totalEarnings: 24800,
    avgRating: 4.7,
    newClients: 98,
    chartData: [1800, 2100, 2400, 1950, 2200, 2800, 2600, 2400, 1900, 2100, 2300, 2500],
    chartLabels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
    topServices: [
      { name: 'Executive Fade', count: 142 },
      { name: 'Haircut & Beard', count: 118 },
      { name: 'Beard Trim', count: 89 },
    ],
    topStaff: [
      { name: 'Kwame Mensah', bookings: 180 },
      { name: 'Kofi Asare', bookings: 142 },
      { name: 'Ama Boateng', bookings: 90 },
    ],
  },
  all: {
    totalBookings: 1240,
    totalEarnings: 78500,
    avgRating: 4.7,
    newClients: 310,
    chartData: [3200, 4100, 5200, 4800, 6200, 7100, 6800],
    chartLabels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    topServices: [
      { name: 'Executive Fade', count: 480 },
      { name: 'Haircut & Beard', count: 390 },
      { name: 'Beard Trim', count: 280 },
    ],
    topStaff: [
      { name: 'Kwame Mensah', bookings: 540 },
      { name: 'Kofi Asare', bookings: 420 },
      { name: 'Ama Boateng', bookings: 280 },
    ],
  },
};

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const { width } = useWindowDimensions();
  const W      = width - 48;
  const H      = 160;
  const PADL   = 36;
  const PADB   = 28;
  const maxVal = Math.max(...data);
  const barW   = (W - PADL) / data.length - 4;

  return (
    <Svg width={W} height={H + PADB}>
      {/* Y-axis lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = H - H * pct;
        return (
          <Line key={pct} x1={PADL} y1={y} x2={W} y2={y} stroke="#f1f2f3" strokeWidth={1} />
        );
      })}
      {/* Bars */}
      {data.map((val, i) => {
        const barH = (val / maxVal) * H;
        const x    = PADL + i * ((W - PADL) / data.length) + 2;
        const y    = H - barH;
        return (
          <Rect key={i} x={x} y={y} width={barW} height={barH}
            rx={4} fill={i === data.indexOf(Math.max(...data)) ? '#3c3cb9' : '#c7c7f5'} />
        );
      })}
      {/* X labels */}
      {labels.map((lbl, i) => {
        const x = PADL + i * ((W - PADL) / data.length) + barW / 2 + 2;
        return (
          <SvgText key={i} x={x} y={H + PADB - 4} textAnchor="middle" fontSize={10} fill="#A0AEC0" fontWeight="600">
            {lbl}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: 14,
      shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        {icon}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A202C' }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatisticsScreen() {
  const insets  = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('month');

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
    // TODO: expo-file-system for local device download
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Statistics</Text>
        <Pressable onPress={exportCSV} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <Download size={17} color="#3c3cb9" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Period tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f1f2f3', borderRadius: 14, padding: 3, marginBottom: 16 }}>
          {(['month', 'year', 'all'] as Period[]).map((p) => (
            <Pressable key={p} onPress={() => setPeriod(p)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: period === p ? '#fff' : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: period === p ? '#1A202C' : '#A0AEC0' }}>
                {p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All Time'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* KPI grid */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <KPICard icon={<BarChart3 size={16} color="#3c3cb9" />} label="Bookings" value={String(d.totalBookings)} color="#3c3cb9" />
          <KPICard icon={<TrendingUp size={16} color="#38A169" />} label="Earnings" value={`₵${d.totalEarnings.toLocaleString()}`} color="#38A169" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <KPICard icon={<Star size={16} color="#D69E2E" />} label="Avg Rating" value={String(d.avgRating)} color="#D69E2E" />
          <KPICard icon={<Users size={16} color="#9333EA" />} label="New Clients" value={String(d.newClients)} color="#9333EA" />
        </View>

        {/* Bar chart */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A202C', marginBottom: 12 }}>Revenue Trend (GHS)</Text>
          <BarChart data={d.chartData} labels={d.chartLabels} />
        </View>

        {/* Top services */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Scissors size={15} color="#3c3cb9" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A202C' }}>Top 3 Services</Text>
          </View>
          {d.topServices.map((s, i) => {
            const maxCount = d.topServices[0].count;
            return (
              <View key={s.name} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: i === 0 ? '#3c3cb9' : '#A0AEC0', width: 18 }}>#{i + 1}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A202C' }}>{s.name}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#3c3cb9' }}>{s.count}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#f1f2f3', borderRadius: 3 }}>
                  <View style={{ width: `${(s.count / maxCount) * 100}%`, height: '100%', backgroundColor: i === 0 ? '#3c3cb9' : '#c7c7f5', borderRadius: 3 }} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Top staff */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Users size={15} color="#3c3cb9" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A202C' }}>Top Staff</Text>
          </View>
          {d.topStaff.map((s, i) => {
            const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase();
            return (
              <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#A0AEC0', width: 18 }}>#{i + 1}</Text>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{initials}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1A202C' }}>{s.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#3c3cb9' }}>{s.bookings}</Text>
              </View>
            );
          })}
        </View>

        {/* Export button */}
        <Pressable onPress={exportCSV} style={{
          backgroundColor: '#1A202C',
          borderRadius: 14, paddingVertical: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Download size={17} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Download Report (.CSV)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
