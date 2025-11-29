import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, Driver!</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Trips and loads will appear here
        </Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#888',
    marginBottom: 32,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    marginBottom: 24,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: '#3a3a4e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
});
