import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function DefectReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Data
  const [inventory, setInventory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Form State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [issueType, setIssueType] = useState('Scratch');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<any>(null);

  const issueTypes = ['Scratch', 'Broken Hinge', 'Bent Frame', 'Missing Part', 'Other'];

  // 1. Fetch Inventory on Load
  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    const { data } = await supabase.from('inventory').select('id, brand, model, sku, stock_count');
    if (data) setInventory(data);
  }

  // 2. Helper to Reset Form
  const resetForm = () => {
    setSelectedItem(null);
    setNotes('');
    setImage(null);
    setIssueType('Scratch');
    setSearch('');
  };

  // 3. Auto-Reset when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetForm();
      };
    }, [])
  );

  const filteredItems = inventory.filter(i => 
    i.model?.toLowerCase().includes(search.toLowerCase()) || 
    i.brand?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedItem) return Alert.alert('Missing Info', 'Please select the broken item.');
    if (!image) return Alert.alert('Missing Info', 'Photo proof is required.');
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      console.log("Starting Upload...");

      // 1. Upload Image
      const fileExt = image.uri.split('.').pop();
      const fileName = `defect_${Date.now()}.${fileExt}`;
      const filePath = `defects/${fileName}`;

      const response = await fetch(image.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('documents') 
        .upload(filePath, blob);

      if (uploadError) {
        console.error("Upload Failed:", uploadError);
        throw new Error("Photo upload failed. Check Storage Permissions.");
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log("Upload Success, logging defect...");

      // 2. Log Defect
      const { error: dbError } = await supabase.from('defects').insert({
        inventory_id: selectedItem.id,
        reporter_id: user.id,
        issue_type: issueType,
        description: notes,
        photo_url: publicUrl,
        status: 'Open'
      });
      if (dbError) throw dbError;

      // 3. Update Stock
      const newStock = Math.max(0, selectedItem.stock_count - 1);
      await supabase.from('inventory').update({ stock_count: newStock }).eq('id', selectedItem.id);

      // 4. Success Logic
      resetForm(); // Clear the form memory
      
      if (Platform.OS === 'web') {
        window.alert('Report Submitted Successfully');
        router.back();
      } else {
        Alert.alert('Success', 'Report Submitted', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Dashboard</Text></TouchableOpacity>
        <Text style={styles.title}>Log Defect</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.sectionTitle}>1. Identify Item</Text>
      {!selectedItem ? (
        <View>
          <TextInput 
            style={styles.search} 
            placeholder="Search Brand, Model or SKU..." 
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.list}>
            {filteredItems.slice(0, 5).map(item => (
              <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => setSelectedItem(item)}>
                <Text style={styles.itemMain}>{item.brand} {item.model}</Text>
                <Text style={styles.itemSub}>SKU: {item.sku} | Stock: {item.stock_count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.selectedCard}>
          <View>
            <Text style={styles.selectedLabel}>Selected Item:</Text>
            <Text style={styles.selectedMain}>{selectedItem.brand} {selectedItem.model}</Text>
            <Text style={styles.selectedSub}>SKU: {selectedItem.sku}</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedItem(null)}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedItem && (
        <>
          <Text style={styles.sectionTitle}>2. Issue Details</Text>
          <View style={styles.chipRow}>
            {issueTypes.map(type => (
              <TouchableOpacity 
                key={type} 
                style={[styles.chip, issueType === type && styles.activeChip]}
                onPress={() => setIssueType(type)}
              >
                <Text style={[styles.chipText, issueType === type && styles.activeChipText]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Describe the damage..." 
            multiline 
            value={notes} 
            onChangeText={setNotes} 
          />

          <Text style={styles.sectionTitle}>3. Photo Proof</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            ) : (
              <>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>Upload Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Submit Report</Text>}
          </TouchableOpacity>
        </>
      )}
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#64748b', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 20, marginBottom: 10 },
  search: { backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 10 },
  list: { gap: 8 },
  itemCard: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemMain: { fontWeight: 'bold', color: '#334155' },
  itemSub: { fontSize: 12, color: '#64748b' },
  selectedCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  selectedLabel: { fontSize: 10, color: '#2563eb', fontWeight: 'bold', textTransform: 'uppercase' },
  selectedMain: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  selectedSub: { fontSize: 12, color: '#3b82f6' },
  changeText: { color: '#ef4444', fontWeight: 'bold' },
  label: { fontSize: 12, color: '#64748b', marginBottom: 8, marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1' },
  activeChip: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#64748b', fontSize: 12 },
  activeChipText: { color: 'white', fontWeight: 'bold' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', minHeight: 60, textAlignVertical: 'top' },
  uploadBox: { height: 150, backgroundColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1' },
  uploadIcon: { fontSize: 32 },
  uploadText: { color: '#64748b', fontWeight: 'bold' },
  previewImage: { width: '100%', height: '100%' },
  submitBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});