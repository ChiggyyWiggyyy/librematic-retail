import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function DocumentsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  async function fetchData() {
    setLoading(true);
    
    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Get Profile (to check role)
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(userProfile);

    // 3. Fetch Documents based on Role
    let query = supabase
      .from('documents')
      .select(`
        id, file_name, file_url, created_at, file_type,
        sender:profiles!sender_id(full_name),
        recipient:profiles!recipient_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (userProfile.role === 'Manager' || userProfile.role === 'Owner') {
      // Manager sees what they SENT
      query = query.eq('sender_id', user.id);
    } else {
      // Employee sees what they RECEIVED
      query = query.eq('recipient_id', user.id);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    if (data) setDocs(data);
    
    setLoading(false);
  }

  // Handle Opening File
  const openDocument = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Cannot open this file type on this device.");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDocument(item.file_url)}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{item.file_type === 'pdf' ? '📄' : '📷'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.fileName} numberOfLines={1}>{item.file_name}</Text>
        <Text style={styles.meta}>
          {profile?.role === 'Manager' 
            ? `Sent to: ${item.recipient?.full_name}` 
            : `From: ${item.sender?.full_name}`} 
          • {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {profile?.role === 'Manager' ? 'Sent Documents' : 'My Documents'}
        </Text>
        
        {/* Only Managers see the ADD button */}
        {(profile?.role === 'Manager' || profile?.role === 'Owner') ? (
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/dashboard/documents/send')}
          >
            <Text style={styles.addText}>+ Send New</Text>
          </TouchableOpacity>
        ) : <View style={{width: 80}} />} 
      </View>

      <FlatList
        data={docs}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No documents found.</Text>
              <Text style={styles.emptySub}>
                {profile?.role === 'Manager' ? 'Send a file to get started.' : 'Your inbox is empty.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backBtn: { padding: 8 },
  backText: { color: '#64748b', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addText: { color: 'white', fontWeight: 'bold' },

  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  iconBox: { width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  fileName: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 2 },
  meta: { fontSize: 12, color: '#94a3b8' },
  arrow: { fontSize: 18, color: '#cbd5e1', fontWeight: 'bold' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#94a3b8' },
  emptySub: { fontSize: 14, color: '#cbd5e1', marginTop: 8 }
});