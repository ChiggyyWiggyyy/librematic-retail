import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Helper: Get Monday of current week
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(date.setDate(diff));
};

export default function RosterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  // Calculate Dates
  const getVisibleDates = () => {
    const dates = [];
    if (viewMode === 'week') {
      const start = getMonday(currentDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
      }
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = getMonday(new Date(year, month, 1));
      const end = new Date(year, month + 1, 0);
      const d = new Date(start);
      while (d <= end || d.getDay() !== 1) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
        if (dates.length > 42) break;
      }
    }
    return dates;
  };
  const visibleDates = getVisibleDates();

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [currentDate])
  );

  async function fetchData() {
    setLoading(true);
    // Fetch Profiles
    const { data: employees } = await supabase.from('profiles').select('id, full_name, role');
    if (employees) setProfiles(employees);

    // Fetch Shifts
    const { data: shiftData } = await supabase
      .from('shifts')
      .select(`id, start_time, end_time, user_id, area:areas(name, color)`);
    if (shiftData) setShifts(shiftData);
    
    setLoading(false);
  }

  // Navigation Handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  // Logic: Get ALL shifts for a specific cell (Stacking Support)
  function getShiftsForCell(userId: string, columnDate: Date) {
    return shifts.filter(s => {
      const shiftDate = new Date(s.start_time);
      const isSameDate = 
        shiftDate.getDate() === columnDate.getDate() &&
        shiftDate.getMonth() === columnDate.getMonth() &&
        shiftDate.getFullYear() === columnDate.getFullYear();
      return s.user_id === userId && isSameDate;
    });
  }
  
  // Logic: Count shifts for month view
  function getDailyShiftCount(date: Date) {
    return shifts.filter(s => {
      return new Date(s.start_time).toDateString() === date.toDateString();
    }).length;
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
          <TouchableOpacity onPress={() => router.replace('/dashboard')} style={{padding: 8}}>
            <Text style={{fontSize: 20}}>🏠</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.logo}>Shift Planning</Text>
            <Text style={styles.subLogo}>Roster Manager</Text>
          </View>
        </View>
        <View style={styles.navRight}>
           <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === 'week' && styles.activeToggle]} onPress={() => setViewMode('week')}>
              <Text style={[styles.toggleText, viewMode === 'week' && styles.activeToggleText]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === 'month' && styles.activeToggle]} onPress={() => setViewMode('month')}>
              <Text style={[styles.toggleText, viewMode === 'month' && styles.activeToggleText]}>Month</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.push('/dashboard/add-shift')} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Shift</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}>
        {/* Date Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrev} style={styles.navBtn}><Text style={styles.navText}>←</Text></TouchableOpacity>
          <Text style={styles.rangeText}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity onPress={handleNext} style={styles.navBtn}><Text style={styles.navText}>→</Text></TouchableOpacity>
        </View>

        {viewMode === 'week' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{flexGrow: 1}}>
            <View style={styles.table}>
              {/* Header Row */}
              <View style={styles.headerRow}>
                <View style={[styles.cell, styles.nameCol]}><Text style={styles.headText}>Staff</Text></View>
                {visibleDates.map((d, i) => (
                  <View key={i} style={[styles.cell, styles.dateCol]}>
                    <Text style={styles.headText}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                    <Text style={[styles.subHeadText, d.toDateString() === new Date().toDateString() && styles.activeDate]}>{d.getDate()}</Text>
                  </View>
                ))}
              </View>

              {/* Rows */}
              {profiles.map((employee) => (
                <View key={employee.id} style={styles.row}>
                  <View style={[styles.cell, styles.nameCol]}>
                    <Text style={styles.nameText}>{employee.full_name?.split(' ')[0]}</Text>
                    <Text style={styles.roleText}>{employee.role}</Text>
                  </View>
                  
                  {visibleDates.map((d, i) => {
                    const cellShifts = getShiftsForCell(employee.id, d);
                    
                    return (
                      <View key={i} style={[styles.cell, styles.dateCol]}>
                        {cellShifts.length > 0 ? (
                          // Render Stacked Shifts
                          <View style={{width: '100%', gap: 4}}>
                            {cellShifts.map(shift => (
                              <TouchableOpacity 
                                key={shift.id}
                                style={[styles.shiftBlock, { backgroundColor: shift.area?.color || '#3b82f6' }]}
                                //  THIS LINE IS THE FIX BELOW  
                                onPress={() => router.push({ pathname: '/dashboard/shift-details', params: { id: shift.id } } as any)}
                              >
                                <Text style={styles.shiftName}>{employee.full_name?.split(' ')[0]}</Text>
                                <Text style={styles.shiftTime}>
                                  {fmtTime(shift.start_time)} - {fmtTime(shift.end_time)}
                                </Text>
                                <Text style={styles.shiftArea}>{shift.area?.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : <View style={styles.emptySlot} />}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.monthGrid}>
            <View style={styles.weekHeader}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day} style={styles.weekDayText}>{day}</Text>)}
            </View>
            <View style={styles.calendarBody}>
              {visibleDates.map((d, i) => {
                const count = getDailyShiftCount(d);
                return (
                  <View key={i} style={[styles.dayCell, d.getMonth() !== currentDate.getMonth() && styles.dimDay]}>
                    <Text style={[styles.dayNum, d.toDateString() === new Date().toDateString() && styles.todayNum]}>{d.getDate()}</Text>
                    {count > 0 && <View style={styles.eventDot}><Text style={styles.eventText}>{count} Shifts</Text></View>}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  logo: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  subLogo: { fontSize: 12, color: '#64748b' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  activeToggle: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  toggleText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  activeToggleText: { color: '#0f172a' },

  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  content: { flex: 1, padding: 16 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 20 },
  navBtn: { padding: 8 },
  navText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
  rangeText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  
  table: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', minHeight: 90 }, // Taller rows
  
  cell: { padding: 4, borderRightWidth: 1, borderColor: '#f1f5f9', justifyContent: 'center' },
  nameCol: { width: 100, backgroundColor: '#f8fafc' },
  dateCol: { width: 110, alignItems: 'center' },
  
  headText: { fontWeight: 'bold', color: '#475569', fontSize: 11, textAlign: 'center' },
  subHeadText: { fontSize: 14, color: '#64748b', marginTop: 2 },
  activeDate: { color: '#2563eb', fontWeight: 'bold' },
  nameText: { fontWeight: '600', color: '#334155', fontSize: 12 },
  roleText: { fontSize: 9, color: '#94a3b8' },
  
  shiftBlock: { width: '95%', paddingVertical: 4, paddingHorizontal: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 1 },
  shiftName: { color: 'white', fontSize: 11, fontWeight: '800' },
  shiftTime: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '500' },
  shiftArea: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontStyle: 'italic' },
  
  emptySlot: { flex: 1 },

  // Month
  monthGrid: { backgroundColor: 'white', borderRadius: 12, padding: 10 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { width: '14%', textAlign: 'center', fontWeight: 'bold', color: '#94a3b8' },
  calendarBody: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 80, padding: 4, borderWidth: 0.5, borderColor: '#f1f5f9', alignItems: 'center' },
  dimDay: { opacity: 0.3 },
  dayNum: { fontWeight: '600', color: '#334155', marginBottom: 4 },
  todayNum: { color: '#2563eb', fontWeight: 'bold' },
  eventDot: { backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  eventText: { color: '#0284c7', fontSize: 9, fontWeight: 'bold' }
});