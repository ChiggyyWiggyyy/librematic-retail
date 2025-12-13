import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAuthRedirect, supabase } from '../lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  async function handleSignUp() {
    // 1. Validation
    if (!email || !password || !username || !fullName) {
      return Alert.alert('Error', 'Please fill in all fields.');
    }
    
    // Username constraints: 5-12 chars, alphanumeric
    const usernameRegex = /^[a-zA-Z0-9]{5,12}$/;
    if (!usernameRegex.test(username)) {
      return Alert.alert('Invalid Username', 'Username must be 5-12 characters long and contain only letters or numbers.');
    }

    setLoading(true);
    const redirectTo = getAuthRedirect();

    try {
      // 2. Sign Up with Supabase
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            username: username // Passing this to the database trigger
          }
        }
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else {
        Alert.alert(
          'Success!',
          'Account created. Please check your email for the verification link.',
          [{ text: 'OK', onPress: () => router.back() }] // Go back to login
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the Team</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="John Doe" value={fullName} onChangeText={setFullName} />

          <Text style={styles.label}>Choose Username (5-12 chars)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="johndoe123" 
            value={username} 
            onChangeText={setUsername} 
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="name@example.com" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 16, padding: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: -8 },
  input: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  btn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  linkBtn: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#2563eb', fontWeight: '600' }
});