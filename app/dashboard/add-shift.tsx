import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AddShiftScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Data
  const [areas, setAreas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]); // New State
  
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('17:00');

  useEffect(() => {
    fetchStaticData();
  }, []);

  // Fetch Availability whenever DATE changes
  useEffect(() => {
    fetchAvailabilityForDate();
  }, [date]);

  async function fetchStaticData() {
    const { data: areaData } = await supabase.from('areas').select('*');
    if (areaData) setAreas(areaData);
    const { data: userData } = await supabase.from('profiles').select('id, full_name, role');
    if (userData) setProfiles(userData);
  }

  async function fetchAvailabilityForDate() {
    // Get all requests for THIS date
    const { data } = await supabase
      .from('availability')
      .select('user_id, status, note')
      .eq('date', date);
    
    if (data) setAvailability(data);
    else setAvailability([]);
  }

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) setSelectedUsers(selectedUsers.filter(id => id !== userId));
    else setSelectedUsers([...selectedUsers, userId]);
  };

  const handleCreateShift = async () => {
    if (!selectedArea) return Alert.alert('Missing', 'Select Area');
    if (selectedUsers.length === 0) return Alert.alert('Missing', 'Select Staff');
    
    setLoading(true);
    const startISO = `${date}T${startHour}:00`;
    const endISO = `${date}T${endHour}:00`;

    const shiftsToInsert = selectedUsers.map(userId => ({
      user_id: userId,
      area_id: selectedArea,
      start_time: new Date(startISO).toISOString(),
      end_time: new Date(endISO).toISOString(),
      is_published: true
    }));

    const { error } = await supabase.from('shifts').insert(shiftsToInsert);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Shifts Published!');
      router.back();
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule Shift</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Date Input moved to TOP so it drives the availability list */}
        <Text style={styles.label}>1. Select Date & Time</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <View style={styles.row}>
          <TextInput style={[styles.input, {flex:1}]} value={startHour} onChangeText={setStartHour} />
          <TextInput style={[styles.input, {flex:1}]} value={endHour} onChangeText={setEndHour} />
        </View>

        {/* Team Selection with Availability Indicators */}
        <Text style={styles.label}>2. Select Team</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {profiles.map((user) => {
            const isSelected = selectedUsers.includes(user.id);
            const status = availability.find(a => a.user_id === user.id);
            const isUnavailable = status?.status === 'Unavailable';
            const isAvailable = status?.status === 'Available';

            return (
              <TouchableOpacity 
                key={user.id} 
                style={[
                  styles.userChip, 
                  isSelected && styles.activeChip,
                  isUnavailable && styles.redBorder, // Visual Warning
                  isAvailable && styles.greenBorder  // Visual Good Signal
                ]}
                onPress={() => toggleUser(user.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                  {user.full_name?.split(' ')[0]}
                </Text>
                
                {/* Status Indicator */}
                {status && (
                  <View style={[styles.statusBadge, isUnavailable ? styles.bgRed : styles.bgGreen]}>
                    <Text style={styles.statusText}>
                      {isUnavailable ? 'BUSY' : 'FREE'}
                    </Text>
                  </View>
                )}
                
                {/* Show Note if exists */}
                {status?.note && <Text style={styles.noteText}>"{status.note}"</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>3. Select Area</Text>
        <View style={styles.grid}>
          {areas.map((area) => (
            <TouchableOpacity 
              key={area.id} 
              style={[styles.areaBadge, selectedArea === area.id && { backgroundColor: area.color, borderColor: area.color }]}
              onPress={() => setSelectedArea(area.id)}
            >
              <Text style={[styles.areaText, selectedArea === area.id && { color: 'white' }]}>{area.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateShift} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Publish</Text>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  closeText: { color: '#64748b', fontSize: 16 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 10, backgroundColor: '#f8fafc' },
  row: { flexDirection: 'row', gap: 15 },
  
  scrollRow: { flexDirection: 'row', marginBottom: 10 },
  userChip: { padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 10, minWidth: 100, borderWidth: 2, borderColor: 'transparent' },
  activeChip: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  activeChipText: { color: 'white' },
  
  // New Status Styles
  redBorder: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  greenBorder: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  bgRed: { backgroundColor: '#ef4444' },
  bgGreen: { backgroundColor: '#22c55e' },
  statusText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  noteText: { fontSize: 9, color: '#64748b', fontStyle: 'italic' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  areaBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white' },
  areaText: { fontWeight: '600', color: '#475569' },
  saveBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});