import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function AddItemScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Fields
  const [category, setCategory] = useState('Sunglasses');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');

  const categories = ['Sunglasses', 'Watches', 'Accessories', 'Cases'];

  async function handleSave() {
    if (!brand || !model || !stock) return Alert.alert('Error', 'Brand, Model and Stock are required.');
    
    setLoading(true);
    const { error } = await supabase.from('inventory').insert({
      category,
      brand,
      model,
      sku,
      stock_count: parseInt(stock),
      price: parseFloat(price) || 0
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Item added!');
      router.back();
    }
    setLoading(false);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Item</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
      </View>

      {/* 1. Category Selector */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.catRow}>
        {categories.map((cat) => (
          <TouchableOpacity 
            key={cat} 
            style={[styles.catChip, category === cat && styles.activeCat]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.catText, category === cat && styles.activeCatText]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 2. Details */}
      <Text style={styles.label}>Brand</Text>
      <TextInput style={styles.input} placeholder="e.g. Ray-Ban / Rolex" value={brand} onChangeText={setBrand} />

      <Text style={styles.label}>Model Name</Text>
      <TextInput style={styles.input} placeholder="e.g. Submariner" value={model} onChangeText={setModel} />

      <Text style={styles.label}>SKU / Barcode</Text>
      <TextInput style={styles.input} placeholder="Scan Code..." value={sku} onChangeText={setSku} />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Stock Quantity</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={stock} onChangeText={setStock} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Price (€)</Text>
          <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={price} onChangeText={setPrice} />
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Item</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  closeText: { color: '#64748b', fontSize: 16 },
  
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#f8fafc' },
  
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white' },
  activeCat: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catText: { fontWeight: '600', color: '#64748b' },
  activeCatText: { color: 'white' },

  row: { flexDirection: 'row', gap: 16 },
  
  saveBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 40, marginBottom: 40 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});