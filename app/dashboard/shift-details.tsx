import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ShiftDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Shift ID
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Get Shift Details
    const { data: shiftData, error } = await supabase
      .from('shifts')
      .select('*, area:areas(name), profile:profiles(full_name, id)')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Shift not found');
      router.back();
      return;
    }
    setShift(shiftData);

    // 3. Check if there is already a swap request
    const { data: swap } = await supabase
      .from('shift_swaps')
      .select('status')
      .eq('shift_id', id)
      .neq('status', 'Rejected') // Ignore rejected ones
      .maybeSingle();
    
    if (swap) setSwapStatus(swap.status);

    setLoading(false);
  }

  // --- ACTIONS ---

  // 1. Manager: Edit (Redirect)
  const handleEdit = () => {
    router.push({ pathname: '/dashboard/edit-shift', params: { id: shift.id } });
  };

  // 2. Employee: Offer for Swap
  const handleOfferSwap = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm("Offer this shift to the team?")) return;
    } 
    
    const { error } = await supabase.from('shift_swaps').insert({
      shift_id: shift.id,
      requester_id: currentUser.id,
      status: 'Open'
    });

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Shift offered to the marketplace.');
      fetchData(); // Refresh UI
    }
  };

  // Format Helper
  const fmtTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
  const fmtDate = (iso: string) => {
    return new Date(iso).toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'});
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} color="#2563eb" />;

  const isMyShift = currentUser?.id === shift?.user_id;
  // We assume 'Manager' logic check happens in parent or we fetch profile role here. 
  // For simplicity: If it's NOT my shift, I assume I'm viewing it as a colleague or manager.

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.area}>{shift.area?.name}</Text>
        <Text style={styles.date}>{fmtDate(shift.start_time)}</Text>
        <Text style={styles.time}>{fmtTime(shift.start_time)} - {fmtTime(shift.end_time)}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.assigneeLabel}>Assigned to:</Text>
        <Text style={styles.assignee}>{shift.profile?.full_name}</Text>

        {/* STATUS INDICATOR */}
        {swapStatus && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              Status: {swapStatus === 'Open' ? 'Offered to Team' : 'Pending Approval'}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {/* MANAGER: EDIT BUTTON */}
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleEdit}>
            <Text style={styles.secondaryText}>Edit / Delete (Manager)</Text>
          </TouchableOpacity>

          {/* EMPLOYEE: OFFER BUTTON (Only if it's mine and not already offered) */}
          {isMyShift && !swapStatus && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleOfferSwap}>
              <Text style={styles.primaryText}>✋ Offer Swap</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 16, padding: 24 },
  
  area: { fontSize: 14, color: '#2563eb', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  date: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  time: { fontSize: 18, color: '#475569', marginBottom: 20 },
  
  divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 20 },
  
  assigneeLabel: { fontSize: 12, color: '#94a3b8' },
  assignee: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 20 },

  statusBox: { backgroundColor: '#fff7ed', padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#fdba74' },
  statusText: { color: '#c2410c', fontWeight: 'bold', textAlign: 'center' },

  actions: { gap: 12 },
  primaryBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  secondaryBtn: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryText: { color: '#475569', fontWeight: 'bold' },

  closeBtn: { padding: 16, alignItems: 'center' },
  closeText: { color: '#64748b' }
});