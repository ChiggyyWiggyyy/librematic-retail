import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function EditShiftScreen() {
  const router = useRouter();
  // Get the Shift ID passed from the dashboard
  const { id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [areas, setAreas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Form State
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');

  useEffect(() => {
    loadShiftData();
  }, [id]);

  async function loadShiftData() {
    // 1. Fetch Lists
    const { data: areaData } = await supabase.from('areas').select('*');
    if (areaData) setAreas(areaData);
    
    const { data: userData } = await supabase.from('profiles').select('id, full_name, role');
    if (userData) setProfiles(userData);

    // 2. Fetch The Specific Shift
    const { data: shift, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !shift) {
      Alert.alert('Error', 'Could not load shift.');
      router.back();
      return;
    }

    // 3. Pre-fill the Form
    setSelectedArea(shift.area_id);
    setSelectedUser(shift.user_id);
    
    // Parse ISO string back to inputs (e.g. "2023-12-11T09:00:00")
    const startObj = new Date(shift.start_time);
    const endObj = new Date(shift.end_time);
    
    setDate(shift.start_time.split('T')[0]); // "2023-12-11"
    setStartHour(startObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
    setEndHour(endObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
    
    setLoading(false);
  }

  async function handleUpdate() {
    setSaving(true);
    const startISO = `${date}T${startHour}:00`;
    const endISO = `${date}T${endHour}:00`;

    const { error } = await supabase
      .from('shifts')
      .update({
        user_id: selectedUser,
        area_id: selectedArea,
        start_time: new Date(startISO).toISOString(),
        end_time: new Date(endISO).toISOString(),
      })
      .eq('id', id);

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Shift updated!');
      router.back();
    }
    setSaving(false);
  }

  async function handleDelete() {
    // 1. WEB LOGIC (Browser friendly)
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to delete this shift?");
      if (confirmed) {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          router.back();
        }
      }
      return; // Stop here for web
    }

    // 2. MOBILE LOGIC (iOS/Android fancy alert)
    Alert.alert(
      "Delete Shift",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.from('shifts').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              router.back();
            }
          }
        }
      ]
    );
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb"/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Shift</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. Employee (Read Only recommended, but editable if needed) */}
        <Text style={styles.label}>Employee</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {profiles.map((user) => (
            <TouchableOpacity 
              key={user.id} 
              style={[styles.userChip, selectedUser === user.id && styles.activeChip]}
              onPress={() => setSelectedUser(user.id)}
            >
              <Text style={[styles.chipText, selectedUser === user.id && styles.activeChipText]}>
                {user.full_name?.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 2. Area */}
        <Text style={styles.label}>Role / Area</Text>
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

        {/* 3. Time */}
        <Text style={styles.label}>Date & Time</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} />
        
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Start</Text>
            <TextInput style={styles.input} value={startHour} onChangeText={setStartHour} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>End</Text>
            <TextInput style={styles.input} value={endHour} onChangeText={setEndHour} />
          </View>
        </View>

        {/* ACTIONS */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Shift</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  closeText: { color: '#64748b', fontSize: 16 },
  
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginTop: 20, marginBottom: 10 },
  subLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  
  scrollRow: { flexDirection: 'row', marginBottom: 10 },
  userChip: { padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 10 },
  activeChip: { backgroundColor: '#2563eb' },
  chipText: { fontWeight: 'bold', color: '#334155' },
  activeChipText: { color: 'white' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  areaBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white' },
  areaText: { fontWeight: '600', color: '#475569' },

  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 15 },

  saveBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  deleteBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  deleteBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});