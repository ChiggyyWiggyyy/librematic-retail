import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function HoursScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Stats
  const [workedThisMonth, setWorkedThisMonth] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  
  // Manager Data
  const [allStaff, setAllStaff] = useState<any[]>([]);

  // Request Modal
  const [showModal, setShowModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get My Profile
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(myProfile);

    if (myProfile.role === 'Manager') {
      // MANAGER: Fetch All Staff Balances & Pending Requests
      const { data: staff } = await supabase.from('profiles').select('*').order('full_name');
      setAllStaff(staff || []);
      
      const { data: requests } = await supabase
        .from('leave_requests')
        .select('*, profile:profiles(full_name)')
        .eq('status', 'Pending');
      setLeaveRequests(requests || []);

    } else {
      // EMPLOYEE: Calculate My Hours for THIS Month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const { data: entries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('clock_in', startOfMonth.toISOString());

      let totalMs = 0;
      entries?.forEach(e => {
        if (e.clock_in && e.clock_out) {
          totalMs += new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
        }
      });
      setWorkedThisMonth(Math.round(totalMs / (1000 * 60 * 60))); // Hours

      // Fetch My Requests
      const { data: myRequests } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      setLeaveRequests(myRequests || []);
    }
    setLoading(false);
  }

  // --- EMPLOYEE ACTIONS ---
  async function submitLeaveRequest() {
    if (profile.overtime_balance < 8) {
      Alert.alert("Low Balance", "You don't have enough Advanced Hours (8h needed) for a full day off.");
      return;
    }

    const { error } = await supabase.from('leave_requests').insert({
      user_id: profile.id,
      date: leaveDate,
      hours_requested: 8, // Standard day
      status: 'Pending'
    });

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Request sent to Manager.');
      setShowModal(false);
      fetchData();
    }
  }

  // --- MANAGER ACTIONS ---
  async function handleApproval(request: any, approved: boolean) {
    if (approved) {
      // 1. Deduct hours from user's bank
      // First get current balance again to be safe
      const { data: userNow } = await supabase.from('profiles').select('overtime_balance').eq('id', request.user_id).single();
      const newBalance = (userNow?.overtime_balance || 0) - request.hours_requested;

      await supabase.from('profiles').update({ overtime_balance: newBalance }).eq('id', request.user_id);
      
      // 2. Update Request Status
      await supabase.from('leave_requests').update({ status: 'Approved' }).eq('id', request.id);
      Alert.alert("Approved", "Hours deducted and leave granted.");
    } else {
      await supabase.from('leave_requests').update({ status: 'Rejected' }).eq('id', request.id);
    }
    fetchData();
  }

  // --- RENDER ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Dashboard</Text></TouchableOpacity>
        <Text style={styles.title}>{profile?.role === 'Manager' ? 'Team Balances' : 'My Hours Account'}</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}>
        
        {/* === EMPLOYEE VIEW === */}
        {profile?.role !== 'Manager' && (
          <>
            {/* The Balance Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Working Time Account</Text>
              
              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>Contract Target</Text>
                  <Text style={styles.value}>{profile?.monthly_hours} h</Text>
                </View>
                <View>
                  <Text style={styles.label}>Worked (Month)</Text>
                  <Text style={[styles.value, { color: workedThisMonth > (profile?.monthly_hours || 0) ? '#16a34a' : '#0f172a' }]}>
                    {workedThisMonth} h
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Advanced Hours (Bank)</Text>
                <Text style={styles.balanceValue}>+{profile?.overtime_balance} hrs</Text>
              </View>

              <TouchableOpacity style={styles.redeemBtn} onPress={() => setShowModal(true)}>
                <Text style={styles.redeemText}>🌴 Use Hours for Leave</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>My Requests</Text>
            {leaveRequests.map(req => (
              <View key={req.id} style={styles.reqCard}>
                <Text style={styles.reqDate}>{req.date}</Text>
                <Text style={[styles.status, 
                  req.status === 'Approved' ? styles.stGreen : 
                  req.status === 'Rejected' ? styles.stRed : styles.stOrange
                ]}>{req.status}</Text>
              </View>
            ))}
          </>
        )}

        {/* === MANAGER VIEW === */}
        {profile?.role === 'Manager' && (
          <>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {leaveRequests.length === 0 ? <Text style={styles.empty}>No pending requests.</Text> : null}
            
            {leaveRequests.map(req => (
              <View key={req.id} style={styles.approveCard}>
                <View>
                  <Text style={styles.reqName}>{req.profile?.full_name}</Text>
                  <Text style={styles.reqDetail}>Wants {req.date} Off ({req.hours_requested}h)</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleApproval(req, false)} style={styles.rejectBtn}><Text style={styles.btnTxt}>✗</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleApproval(req, true)} style={styles.approveBtn}><Text style={styles.btnTxt}>✓</Text></TouchableOpacity>
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Employee Accounts</Text>
            {allStaff.map(staff => (
              <View key={staff.id} style={styles.staffRow}>
                <View>
                  <Text style={styles.staffName}>{staff.full_name}</Text>
                  <Text style={styles.staffRole}>{staff.role}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.label}>Bank</Text>
                  <Text style={[styles.value, {fontSize: 16}]}>
                    {staff.overtime_balance > 0 ? '+' : ''}{staff.overtime_balance} h
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

      </ScrollView>

      {/* REQUEST MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Paid Leave</Text>
            <Text style={styles.modalSub}>This will deduct 8 hours from your balance.</Text>
            
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={leaveDate} onChangeText={setLeaveDate} />
            
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitLeaveRequest} style={styles.confirmBtn}><Text style={styles.confirmText}>Submit</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backText: { color: '#64748b', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 20 },
  
  // Card
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 8 },
  balanceLabel: { color: '#1e40af', fontWeight: 'bold' },
  balanceValue: { color: '#1e40af', fontWeight: 'bold', fontSize: 18 },
  redeemBtn: { marginTop: 16, backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  redeemText: { color: 'white', fontWeight: 'bold' },

  // Lists
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' },
  reqCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 8 },
  reqDate: { fontWeight: 'bold', color: '#334155' },
  status: { fontWeight: 'bold', fontSize: 12 },
  stOrange: { color: '#ca8a04' }, stGreen: { color: '#16a34a' }, stRed: { color: '#ef4444' },

  // Manager Views
  staffRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  staffName: { fontWeight: 'bold', color: '#0f172a' },
  staffRole: { fontSize: 12, color: '#64748b' },
  approveCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderColor: '#f59e0b' },
  reqName: { fontWeight: 'bold' },
  reqDetail: { fontSize: 12, color: '#64748b' },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 36, height: 36, backgroundColor: '#22c55e', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 36, height: 36, backgroundColor: '#ef4444', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: 'white', fontWeight: 'bold' },
  empty: { color: '#94a3b8', fontStyle: 'italic', marginBottom: 20 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSub: { color: '#64748b', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 8, marginTop: 4, marginBottom: 20, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  confirmText: { color: 'white', fontWeight: 'bold' }
});