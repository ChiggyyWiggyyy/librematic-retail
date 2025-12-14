import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAuthRedirect, supabase } from '../lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Helper for Alerts (Web vs Mobile)
  const alertUser = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function handleSignUp() {
    // 1. Basic Validation
    if (!email || !password || !username || !fullName) {
      return alertUser('Missing Info', 'Please fill in all fields.');
    }
    
    const usernameRegex = /^[a-zA-Z0-9]{5,12}$/;
    if (!usernameRegex.test(username)) {
      return alertUser('Invalid Username', 'Username must be 5-12 chars (letters/numbers only).');
    }

    setLoading(true);
    const redirectTo = getAuthRedirect();

    try {
      // 2. CHECK: Is Username Taken?
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle(); // Safe check

      if (existingUser) {
        throw new Error('This username is already taken but you are not.');
      }

      // 3. CHECK: Is Email Taken? (Pre-check via profiles)
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        throw new Error('This email is already registered. Please Log In.');
      }

      // 4. Attempt Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            username: username
          }
        }
      });

      if (error) throw error;

      // 5. Handling "User Already Exists" logic from Auth provider
      // Sometimes Supabase returns success but with a null session if user exists but unverified
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('This email is already registered Loser!!!');
      }

      // 6. SUCCESS
      // Clear fields to prevent double submission
      setEmail('');
      setPassword('');
      setUsername('');
      setFullName('');
      
      alertUser(
        'Success', 
        'Thanks for trusting us, now you are cooked. Check email for the verification cookie.'
      );
      
      // Optional: Send them back to login after a delay
      setTimeout(() => router.replace('/'), 2000);

    } catch (err: any) {
      let msg = err.message;
      if (msg.includes('already registered') || msg.includes('unique constraint')) {
        msg = 'You think you are so smart? Guess What Loser!! try again with some other user/email';
      }
      alertUser('Registration Failed', msg);
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