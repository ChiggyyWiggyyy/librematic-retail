import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
// Import the new TimeClock component
import TimeClock from '../../components/TimeClock';

export default function DashboardHub() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  async function fetchProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const managerModules = [
    { title: 'Shift Planning', desc: 'Roster & Scheduling', icon: '📅', route: '/dashboard/roster', color: '#2563eb' },
    { title: 'Inventory', desc: 'Stock & Products', icon: '👓', route: '/dashboard/inventory', color: '#16a34a' },
    { title: 'Documents', desc: 'Contracts & Files', icon: '📂', route: '/dashboard/documents', color: '#ca8a04' },
    { title: 'Inbox', desc: 'Defects & Requests', icon: '📥', route: '/dashboard/inbox', color: '#7c3aed' },
    { title: 'Defect Log', desc: 'Report Issue', icon: '⚠️', route: '/dashboard/defects', color: '#ef4444' },
    { title: 'Settings', desc: 'App Config', icon: '⚙️', route: '/dashboard/settings', color: '#475569' },
    { 
      title: 'Hours Account', 
      desc: 'Balance & Leave', 
      icon: '⏳', 
      route: '/dashboard/hours',
      color: '#f59e0b' // Amber
    },
    { 
      title: 'Availability', 
      desc: 'Requests & Notes', 
      icon: '🗓️', 
      route: '/dashboard/availability', 
      color: '#8b5cf6' // Violet
    },
  ];

  const employeeModules = [
    { title: 'My Shifts', desc: 'View Schedule', icon: '📅', route: '/dashboard/roster', color: '#2563eb' },
    { title: 'My Documents', desc: 'Contracts', icon: '📂', route: '/dashboard/documents', color: '#ca8a04' },
    { title: 'Log Defect', desc: 'Report Broken Item', icon: '⚠️', route: '/dashboard/defects', color: '#ef4444' },
    { title: 'My Profile', desc: 'Settings', icon: '👤', route: '/dashboard/settings', color: '#475569' },
    { 
      title: 'Hours Account', 
      desc: 'Balance & Leave', 
      icon: '⏳', 
      route: '/dashboard/hours',
      color: '#f59e0b' // Amber
    },
    { 
      title: 'Availability', 
      desc: 'Requests & Notes', 
      icon: '🗓️', 
      route: '/dashboard/availability', 
      color: '#8b5cf6' // Violet
    },
  ];

  const modules = profile?.role === 'Manager' || profile?.role === 'Owner' 
    ? managerModules 
    : employeeModules;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome,</Text>
          <Text style={styles.user}>{profile?.full_name || 'Loading...'}</Text>
          <Text style={styles.roleBadge}>{profile?.role || 'Staff'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProfile} />}
      >
        {/* ⏱️ HERE IS THE NEW TIME CLOCK */}
        <TimeClock />

        <Text style={styles.sectionTitle}>Your Apps</Text>
        
        <View style={styles.grid}>
          {modules.map((mod, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.card}
              onPress={() => router.push(mod.route as any)}
            >
              <View style={[styles.iconBox, { backgroundColor: mod.color }]}>
                <Text style={styles.icon}>{mod.icon}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{mod.title}</Text>
                <Text style={styles.cardDesc}>{mod.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  welcome: { fontSize: 14, color: '#64748b' },
  user: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  roleBadge: { fontSize: 12, color: '#2563eb', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  logoutBtn: { backgroundColor: '#fee2e2', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontWeight: '600' },
  content: { padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  card: { width: '47%', backgroundColor: 'white', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, alignItems: 'center', gap: 12 },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 24 },
  cardText: { alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  cardDesc: { fontSize: 12, color: '#64748b', textAlign: 'center' },
});