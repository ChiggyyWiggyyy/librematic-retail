import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  // Store Settings State
  const [storeName, setStoreName] = useState('');
  const [timeClockEnabled, setTimeClockEnabled] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // 1. Get User Profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) setFullName(profile.full_name);
    }

    // 2. Get Global Store Settings
    const { data: settings } = await supabase.from('app_settings').select('*').eq('setting_key', 'store_config').single();
    if (settings && settings.setting_value) {
      setStoreName(settings.setting_value.store_name || 'My Store');
      setTimeClockEnabled(settings.setting_value.time_clock_enabled ?? true);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      // 2. Update Store Settings
      const newConfig = {
        store_name: storeName,
        time_clock_enabled: timeClockEnabled
      };

      const { error: settingsError } = await supabase
        .from('app_settings')
        .update({ setting_value: newConfig })
        .eq('setting_key', 'store_config');

      if (settingsError) throw settingsError;

      Alert.alert('Success', 'Settings saved successfully!');
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{width: 80}} />
      </View>

      <ScrollView style={styles.content}>
        
        {/* SECTION 1: MY PROFILE */}
        <Text style={styles.sectionTitle}>My Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            value={fullName} 
            onChangeText={setFullName} 
            placeholder="John Doe"
          />
          
          <Text style={styles.label}>Email (Read Only)</Text>
          <TextInput 
            style={[styles.input, styles.disabledInput]} 
            value={email} 
            editable={false} 
          />
        </View>

        {/* SECTION 2: STORE CONFIGURATION */}
        <Text style={styles.sectionTitle}>Store Configuration</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Store Name</Text>
          <TextInput 
            style={styles.input} 
            value={storeName} 
            onChangeText={setStoreName} 
            placeholder="Berlin Store"
          />

          <View style={styles.row}>
            <View style={{flex: 1}}>
              <Text style={styles.rowTitle}>Enable Time Clock</Text>
              <Text style={styles.rowSub}>Allow staff to punch in/out</Text>
            </View>
            <Switch 
              value={timeClockEnabled} 
              onValueChange={setTimeClockEnabled} 
              trackColor={{ false: "#767577", true: "#2563eb" }}
            />
          </View>
        </View>

        {/* SECTION 3: DANGER ZONE */}
        <Text style={styles.sectionTitle}>System</Text>
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{height: 20}} />
        
        {/* SAVE BUTTON */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving || loading}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backBtn: { padding: 8 },
  backText: { color: '#64748b', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  content: { flex: 1, padding: 20 },
  
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 16, fontSize: 16 },
  disabledInput: { backgroundColor: '#f1f5f9', color: '#94a3b8' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  rowSub: { fontSize: 12, color: '#64748b' },

  saveBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  logoutBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});