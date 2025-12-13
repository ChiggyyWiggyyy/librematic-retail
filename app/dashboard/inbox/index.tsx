import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function InboxScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [defects, setDefects] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [filter, setFilter] = useState<'Defects' | 'Market' | 'Archive'>('Defects');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [filter])
  );

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUserRole(p?.role || 'employee');
    }

    if (filter === 'Defects' || filter === 'Archive') {
      const status = filter === 'Defects' ? 'Open' : 'Resolved';
      const { data } = await supabase.from('defects').select('*, reporter:profiles(full_name), item:inventory(brand, model)').eq('status', status).order('created_at', {ascending: false});
      if (data) setDefects(data);
    } 
    
    if (filter === 'Market') {
      // Fetch OPEN swap requests
      const { data } = await supabase
        .from('shift_swaps')
        .select(`
          id, status, 
          requester:profiles!requester_id(full_name),
          shift:shifts(start_time, end_time, area:areas(name))
        `)
        .eq('status', 'Open') // Only show available ones
        .neq('requester_id', user?.id); // Don't show my own offers
        
      if (data) setSwaps(data);
    }
    setLoading(false);
  }

  // --- SWAP LOGIC ---
  async function handleClaimSwap(swapId: number) {
    // 1. Taker claims it -> Status becomes Pending Approval
    const { error } = await supabase
      .from('shift_swaps')
      .update({ 
        taker_id: userId, 
        status: 'Pending_Approval' 
      })
      .eq('id', swapId);

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Claimed!', 'Waiting for Manager approval.');
      fetchData();
    }
  }

  // --- MANAGER LOGIC ---
  async function handleApproveSwap(swap: any) {
    // 1. Update the actual Shift owner
    const { error: shiftError } = await supabase
      .from('shifts')
      .update({ user_id: swap.taker_id })
      .eq('id', swap.shift_id);

    if (shiftError) return Alert.alert('Error', shiftError.message);

    // 2. Mark Swap as Approved
    await supabase.from('shift_swaps').update({ status: 'Approved' }).eq('id', swap.id);
    
    Alert.alert('Approved', 'Roster updated.');
    fetchData();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>← Dashboard</Text></TouchableOpacity>
        <Text style={styles.title}>Inbox & Market</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, filter === 'Defects' && styles.activeTab]} onPress={() => setFilter('Defects')}>
          <Text style={[styles.tabText, filter === 'Defects' && styles.activeTabText]}>Defects</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filter === 'Market' && styles.activeTab]} onPress={() => setFilter('Market')}>
          <Text style={[styles.tabText, filter === 'Market' && styles.activeTabText]}>Shift Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filter === 'Archive' && styles.activeTab]} onPress={() => setFilter('Archive')}>
          <Text style={[styles.tabText, filter === 'Archive' && styles.activeTabText]}>Archive</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}>
        
        {/* === DEFECTS VIEW === */}
        {(filter === 'Defects' || filter === 'Archive') && defects.map(d => (
          <View key={d.id} style={styles.card}>
            <Text style={{fontWeight:'bold'}}>{d.issue_type}</Text>
            <Text>{d.description}</Text>
            <Text style={{color:'#64748b', fontSize:12}}>Reported by {d.reporter?.full_name}</Text>
          </View>
        ))}

        {/* === MARKET VIEW === */}
        {filter === 'Market' && swaps.map(swap => (
          <View key={swap.id} style={styles.swapCard}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>Shift Offer</Text>
              <Text style={styles.swapFrom}>From: {swap.requester?.full_name}</Text>
            </View>
            
            <View style={styles.swapDetails}>
              <Text style={styles.swapDate}>
                {new Date(swap.shift.start_time).toLocaleDateString()}
              </Text>
              <Text style={styles.swapTime}>
                {new Date(swap.shift.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                {new Date(swap.shift.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </Text>
              <Text style={styles.swapArea}>{swap.shift.area?.name}</Text>
            </View>

            <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaimSwap(swap.id)}>
              <Text style={styles.claimText}>✋ I'll Take It</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* EMPTY STATE */}
        {!loading && ((filter === 'Market' && swaps.length === 0) || (filter !== 'Market' && defects.length === 0)) && (
          <Text style={{textAlign:'center', marginTop: 40, color:'#94a3b8'}}>No items found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', alignItems: 'center' },
  backBtn: { padding: 8 }, backText: { color: '#64748b' }, title: { fontSize: 18, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', padding: 16, gap: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#e2e8f0' },
  activeTab: { backgroundColor: '#2563eb' },
  tabText: { color: '#64748b', fontWeight: 'bold' },
  activeTabText: { color: 'white' },
  content: { flex: 1, padding: 16 },
  
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10 },
  
  // SWAP CARD
  swapCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderColor: '#16a34a' },
  swapHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  swapTitle: { fontWeight: 'bold', color: '#16a34a' },
  swapFrom: { color: '#64748b', fontSize: 12 },
  swapDetails: { backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, marginBottom: 12 },
  swapDate: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  swapTime: { fontSize: 14, color: '#334155' },
  swapArea: { fontSize: 12, color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
  claimBtn: { backgroundColor: '#16a34a', padding: 12, borderRadius: 8, alignItems: 'center' },
  claimText: { color: 'white', fontWeight: 'bold' }
});