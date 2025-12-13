import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [loginInput, setLoginInput] = useState(''); // Can be email OR username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      let emailToUse = loginInput.trim();

      // 1. Detect if input is NOT an email (i.e., it's a username)
      const isEmail = loginInput.includes('@');
      
      if (!isEmail) {
        // It's a username! We need to find the email attached to it.
        const { data, error } = await supabase.rpc('get_email_by_username', { uname: loginInput });
        
        if (error || !data) {
          setLoading(false);
          return Alert.alert('Login Failed', 'Username not found.');
        }
        emailToUse = data; // We found the email!
      }

      // 2. Perform Standard Login using the resolved email
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      Alert.alert('Error', 'Connection error');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>LibreMatic</Text>
        <Text style={styles.subtitle}>Retail Workforce Manager</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="user@store.com OR username"
            placeholderTextColor="#999"
            value={loginInput}
            onChangeText={setLoginInput}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        {/* This button now redirects to the NEW Signup Screen */}
        <TouchableOpacity 
          onPress={() => router.push('/signup')} 
          style={styles.linkButton}
        >
           <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 16, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2563eb', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginLeft: 4 },
  input: { width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a' },
  button: { backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
});