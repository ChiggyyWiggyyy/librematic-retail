import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function AvailabilityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [dates, setDates] = useState<Date[]>([]);
  
  // UI State
  const [availability, setAvailability] = useState<any[]>([]);
  // Shadow State (For instant logic checks)
  const availabilityRef = useRef<any[]>([]);
  
  // Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      generateDates();
      fetchAvailability(user.id);
    }
    setLoading(false);
  }

  function generateDates() {
    const d = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      d.push(date);
    }
    setDates(d);
  }

  async function fetchAvailability(uid: string) {
    const { data } = await supabase.from('availability').select('*').eq('user_id', uid);
    if (data) {
      setAvailability(data);
      availabilityRef.current = data; // Sync shadow state
    }
  }

  // 🔄 ROBUST CYCLE TOGGLE
  // Logic: Neutral -> Green -> Red -> Neutral
  const handleToggle = (dateObj: Date) => {
    const dateStr = dateObj.toISOString().split('T')[0];
    
    // 1. Check the REF (Instant truth), not the State (Delayed truth)
    const existing = availabilityRef.current.find(a => a.date === dateStr);
    const currentStatus = existing?.status || 'Neutral';

    let nextStatus = 'Available'; // Default to Green
    if (currentStatus === 'Available') {
      nextStatus = 'Unavailable'; // Go Red
    } else if (currentStatus === 'Unavailable') {
      nextStatus = 'Neutral'; // Go Clear
    }

    // 2. Update UI & Ref Immediately
    updateLocalState(dateStr, nextStatus, existing?.note || '');

    // 3. Update Database (Background)
    updateDatabase(dateStr, nextStatus, existing?.note || '');
  };

  const updateLocalState = (dateStr: string, status: string, note: string) => {
    let newList;
    if (status === 'Neutral') {
      // Remove item
      newList = availabilityRef.current.filter(a => a.date !== dateStr);
    } else {
      // Add/Update item
      const filtered = availabilityRef.current.filter(a => a.date !== dateStr);
      newList = [...filtered, { date: dateStr, status, note }];
    }
    
    // Update both Ref (Logic) and State (UI)
    availabilityRef.current = newList;
    setAvailability([...newList]);
  };

  const updateDatabase = async (dateStr: string, status: string, note: string) => {
    if (status === 'Neutral') {
      await supabase.from('availability').delete().match({ user_id: userId, date: dateStr });
    } else {
      await supabase.from('availability').upsert({
        user_id: userId,
        date: dateStr,
        status: status,
        note: note
      });
    }
  };

  // Note Logic
  async function saveNote() {
    const existing = availabilityRef.current.find(a => a.date === selectedDate);
    // If adding note to empty day, make it Available (Green) by default
    const statusToSave = existing?.status || 'Available'; 
    
    // Update UI instantly
    updateLocalState(selectedDate, statusToSave, noteText);
    setShowNoteModal(false);

    // Save to DB
    await updateDatabase(selectedDate, statusToSave, noteText);
  }

  const openNote = (dateStr: string) => {
    const existing = availabilityRef.current.find(a => a.date === dateStr);
    setNoteText(existing?.note || '');
    setSelectedDate(dateStr);
    setShowNoteModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Dashboard</Text></TouchableOpacity>
        <Text style={styles.title}>My Availability</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Tap to Cycle: <Text style={{color:'#94a3b8'}}>None</Text> → <Text style={{color:'#22c55e', fontWeight:'bold'}}>Green</Text> → <Text style={{color:'#ef4444', fontWeight:'bold'}}>Red</Text></Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {dates.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0];
          // Read from State for rendering
          const entry = availability.find(a => a.date === dateStr);
          const isGreen = entry?.status === 'Available';
          const isRed = entry?.status === 'Unavailable';

          return (
            <TouchableOpacity 
              key={index} 
              activeOpacity={0.7} // Visual feedback
              style={[
                styles.dayCard, 
                isGreen && styles.greenCard, 
                isRed && styles.redCard
              ]}
              onPress={() => handleToggle(date)}
              onLongPress={() => openNote(dateStr)}
              delayLongPress={500}
            >
              <Text style={[styles.dayName, (isGreen || isRed) && styles.whiteText]}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dateNum, (isGreen || isRed) && styles.whiteText]}>
                {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })}
              </Text>
              
              <Text style={[styles.statusText, (isGreen || isRed) && styles.whiteText]}>
                {isGreen ? 'AVAILABLE' : isRed ? 'NO WORK' : '-'}
              </Text>

              {entry?.note ? (
                <View style={styles.noteIndicator}>
                  <Text style={styles.noteIcon}>📝</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* NOTE MODAL */}
      <Modal visible={showNoteModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note for {selectedDate}</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Doctor's appointment" 
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveNote} style={styles.saveBtn}><Text style={styles.saveText}>Save Note</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white' },
  backText: { color: '#64748b', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold' },
  
  legend: { flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: '#f1f5f9' },
  legendText: { fontSize: 14, color: '#64748b' },

  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dayCard: { width: '30%', aspectRatio: 1, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  
  greenCard: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  redCard: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  whiteText: { color: 'white' },

  dayName: { fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', color: '#64748b' },
  dateNum: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#cbd5e1' },

  noteIndicator: { position: 'absolute', top: 4, right: 4 },
  noteIcon: { fontSize: 10 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', padding: 24, borderRadius: 16 },
  modalTitle: { fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  cancel: { color: '#64748b', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  saveText: { color: 'white', fontWeight: 'bold' }
});