import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Category Filter State
  const categories = ['All', 'Sunglasses', 'Watches', 'Accessories', 'Cases'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [])
  );

  async function fetchInventory() {
    setLoading(true);
    // Fetch EVERYTHING. FlatList handles the performance.
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('brand', { ascending: true });
    
    if (data) setItems(data);
    setLoading(false);
  }

  // Filter Logic
  const filteredItems = items.filter(item => {
    // 1. Text Search
    const matchesSearch = 
      item.brand?.toLowerCase().includes(search.toLowerCase()) || 
      item.model?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
      
    // 2. Category Filter
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Render Single Item (Efficiently)
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.tagRow}>
          <Text style={styles.brand}>{item.brand}</Text>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.model}>{item.model}</Text>
        <Text style={styles.sku}>SKU: {item.sku}</Text>
      </View>
      
      <View style={styles.cardRight}>
        <View style={[styles.stockBadge, item.stock_count < 5 && styles.lowStock]}>
          <Text style={[styles.stockText, item.stock_count < 5 && styles.lowStockText]}>
            {item.stock_count} left
          </Text>
        </View>
        <Text style={styles.price}>€{item.price}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Store Inventory</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => router.push('/dashboard/inventory/add')}
        >
          <Text style={styles.addText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Section */}
      <View style={styles.controls}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="🔍 Search Brand, Model, SKU..." 
          value={search}
          onChangeText={setSearch}
        />
        
        {/* Category Tabs */}
        <View style={styles.tabs}>
          <FlatList 
            horizontal 
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.tab, selectedCategory === item && styles.activeTab]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[styles.tabText, selectedCategory === item && styles.activeTabText]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* THE UNLIMITED LIST */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchInventory}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No items found in this category.</Text> : null
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addText: { color: 'white', fontWeight: 'bold' },

  controls: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, marginBottom: 12 },
  
  tabs: { flexDirection: 'row' },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  activeTab: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { color: '#64748b', fontWeight: '600' },
  activeTabText: { color: 'white' },

  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  cardLeft: { flex: 1, gap: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catText: { fontSize: 10, color: '#64748b', textTransform: 'uppercase' },
  
  brand: { fontSize: 12, fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase' },
  model: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  sku: { fontSize: 12, color: '#94a3b8' },

  cardRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  stockBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockText: { color: '#166534', fontSize: 12, fontWeight: 'bold' },
  lowStock: { backgroundColor: '#fee2e2' },
  lowStockText: { color: '#991b1b' },
  price: { fontSize: 16, fontWeight: '600', color: '#334155' },
  
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});