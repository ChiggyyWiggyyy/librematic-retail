import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function DocumentSenderScreen() {
  const router = useRouter();
  
  // State
  const [step, setStep] = useState(1); // 1: Select User, 2: Upload File
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Selection
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  }

  // Filter Users
  const filteredUsers = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.role?.toLowerCase().includes(search.toLowerCase())
  );

  // 1. Pick File Logic
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all files (PDF, Images)
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      setSelectedFile(file);
    } catch (err) {
      Alert.alert('Error', 'Could not pick file');
    }
  };

  // 2. Upload & Send Logic
  const handleSend = async () => {
    if (!selectedUser || !selectedFile) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // A. Upload to Storage
      // We need a unique name to prevent overwrites
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${selectedUser.id}/${fileName}`; // Store in folder named after recipient

      // Read file for upload (Web vs Native is different)
      let fileBody;
      if (Platform.OS === 'web') {
        // On web, we need to fetch the blob from the URI
        const response = await fetch(selectedFile.uri);
        fileBody = await response.blob();
      } else {
        // Native upload logic (simplified for now, usually requires FormData or FileSystem)
        // For this demo, we assume Web Dashboard usage as requested
        const response = await fetch(selectedFile.uri);
        fileBody = await response.blob();
      }

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, fileBody);

      if (uploadError) throw uploadError;

      // B. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // C. Create Record in Database
      const { error: dbError } = await supabase.from('documents').insert({
        recipient_id: selectedUser.id,
        sender_id: user.id,
        file_name: selectedFile.name,
        file_url: publicUrl,
        file_type: fileExt
      });

      if (dbError) throw dbError;

      Alert.alert('Success', 'Document Sent!');
      router.back();

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Upload failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Reset
  const handleDiscard = () => {
    setSelectedFile(null);
    // Optionally stay on same user or go back
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send Documents</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        
        {/* STEP 1: SELECT USER */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Step 1: Select Recipient</Text>
            <TextInput 
              style={styles.search} 
              placeholder="Search Employee..." 
              value={search}
              onChangeText={setSearch}
            />
            
            <ScrollView style={styles.list}>
              {filteredUsers.map(user => (
                <TouchableOpacity 
                  key={user.id} 
                  style={styles.userCard}
                  onPress={() => {
                    setSelectedUser(user);
                    setStep(2);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.full_name?.charAt(0) || 'U'}</Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    <Text style={styles.userRole}>{user.role}</Text>
                  </View>
                  <Text style={styles.selectText}>Select →</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* STEP 2: UPLOAD & CONFIRM */}
        {step === 2 && selectedUser && (
          <View style={styles.uploadContainer}>
            <Text style={styles.stepTitle}>Step 2: Upload for {selectedUser.full_name}</Text>
            
            <View style={styles.card}>
              <Text style={styles.label}>Recipient:</Text>
              <Text style={styles.value}>{selectedUser.full_name}</Text>
              <Text style={styles.valueSub}>{selectedUser.email}</Text>
              
              <View style={styles.divider} />
              
              {!selectedFile ? (
                <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
                  <Text style={styles.uploadIcon}>📂</Text>
                  <Text style={styles.uploadText}>Click to Choose File</Text>
                  <Text style={styles.uploadSub}>PDF, JPG, PNG supported</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.filePreview}>
                  <Text style={styles.fileIcon}>📄</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.fileName}>{selectedFile.name}</Text>
                    <Text style={styles.fileSize}>{(selectedFile.size / 1024).toFixed(0)} KB</Text>
                  </View>
                  <TouchableOpacity onPress={handleDiscard}>
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ACTION BUTTONS */}
            {selectedFile && (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.discardBtn]} 
                  onPress={() => {
                     setSelectedFile(null);
                     setStep(1); // Go back to list
                  }}
                  disabled={loading}
                >
                  <Text style={styles.discardText}>Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btn, styles.sendBtn]} 
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.sendText}>Send Document</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backBtn: { padding: 8 },
  backText: { color: '#64748b', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  
  content: { flex: 1, padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  
  search: { backgroundColor: 'white', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 16, marginBottom: 16 },
  list: { flex: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 16 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  userRole: { fontSize: 12, color: '#64748b' },
  selectText: { marginLeft: 'auto', color: '#2563eb', fontWeight: '600' },

  uploadContainer: { flex: 1 },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  valueSub: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 20 },
  
  uploadBox: { borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, padding: 40, alignItems: 'center', backgroundColor: '#f8fafc' },
  uploadIcon: { fontSize: 40, marginBottom: 10 },
  uploadText: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  uploadSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  filePreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd' },
  fileIcon: { fontSize: 24, marginRight: 12 },
  fileName: { fontSize: 14, fontWeight: 'bold', color: '#0369a1' },
  fileSize: { fontSize: 12, color: '#0ea5e9' },
  changeText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginLeft: 10 },

  actions: { flexDirection: 'row', gap: 16, marginTop: 30 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  discardBtn: { backgroundColor: '#fee2e2' },
  discardText: { color: '#ef4444', fontWeight: 'bold' },
  sendBtn: { backgroundColor: '#2563eb' },
  sendText: { color: 'white', fontWeight: 'bold' }
});