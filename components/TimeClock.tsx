import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function TimeClock() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    checkStatus();
    
    // Timer Logic
    const timer = setInterval(() => {
      if (working && startTime) {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsed(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [working, startTime]);

  async function checkStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the latest entry that has NO clock_out time
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null) // Still open
        .single();

      if (data) {
        setWorking(true);
        setCurrentEntryId(data.id);
        setStartTime(new Date(data.clock_in));
      } else {
        setWorking(false);
      }
    } catch (e) {
      // No active session found, that's fine
      setWorking(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (working && currentEntryId) {
      // CLOCK OUT
      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', currentEntryId);

      if (error) Alert.alert('Error', error.message);
      else {
        setWorking(false);
        setElapsed('00:00:00');
        Alert.alert('See ya!', 'You are clocked out.');
      }
    } else {
      // CLOCK IN
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          clock_in: new Date().toISOString()
        })
        .select()
        .single();

      if (error) Alert.alert('Error', error.message);
      else if (data) {
        setWorking(true);
        setCurrentEntryId(data.id);
        setStartTime(new Date(data.clock_in));
        Alert.alert('Welcome!', 'You are clocked in.');
      }
    }
    setLoading(false);
  }

  if (loading) return <ActivityIndicator />;

  return (
    <View style={[styles.card, working ? styles.activeCard : styles.inactiveCard]}>
      <View>
        <Text style={[styles.statusLabel, working ? styles.activeText : styles.inactiveText]}>
          {working ? '🟢 CURRENTLY WORKING' : '🔴 CURRENTLY OFF'}
        </Text>
        {working && <Text style={styles.timer}>{elapsed}</Text>}
      </View>

      <TouchableOpacity 
        style={[styles.btn, working ? styles.outBtn : styles.inBtn]}
        onPress={handleToggle}
      >
        <Text style={styles.btnText}>{working ? 'Clock Out' : 'Clock In'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  activeCard: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#10b981' }, // Greenish
  inactiveCard: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' }, // White

  statusLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  activeText: { color: '#059669' },
  inactiveText: { color: '#64748b' },

  timer: { fontSize: 28, fontWeight: 'bold', color: '#064e3b', fontVariant: ['tabular-nums'] }, // Monospaced numbers

  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  inBtn: { backgroundColor: '#2563eb' },
  outBtn: { backgroundColor: '#ef4444' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});