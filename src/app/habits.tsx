import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, Platform } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  target_frequency: number
  frequency_type: string
  created_at: string
  updated_at: string
}

interface DailyLog {
  id: string
  habit_id: string
  log_date: string
  completed: boolean
  notes: string | null
  created_at: string
}

export default function HabitsScreen() {
  const { user, signOut } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [habitName, setHabitName] = useState('')
  const [habitDescription, setHabitDescription] = useState('')
  const [targetFrequency, setTargetFrequency] = useState('1')
  const [frequencyType, setFrequencyType] = useState('daily')

  useEffect(() => {
    if (user) {
      fetchHabits()
      fetchDailyLogs()
    }
  }, [user])

  const fetchHabits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHabits(data || [])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyLogs = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', today)

      if (error) throw error
      setDailyLogs(data || [])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const addHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name')
      return
    }

    try {
      const { error } = await supabase
        .from('habits')
        .insert({
          name: habitName,
          description: habitDescription || null,
          target_frequency: parseInt(targetFrequency),
          frequency_type: frequencyType,
          user_id: user?.id,
        })

      if (error) throw error
      setShowModal(false)
      setHabitName('')
      setHabitDescription('')
      setTargetFrequency('1')
      setFrequencyType('daily')
      fetchHabits()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const toggleHabit = async (habitId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const existingLog = dailyLogs.find(log => log.habit_id === habitId)

      if (existingLog) {
        const { error } = await supabase
          .from('daily_logs')
          .update({ completed: !existingLog.completed })
          .eq('id', existingLog.id)

        if (error) throw error
        setDailyLogs(dailyLogs.map(log => 
          log.id === existingLog.id ? { ...log, completed: !log.completed } : log
        ))
      } else {
        const { error } = await supabase
          .from('daily_logs')
          .insert({
            habit_id: habitId,
            log_date: today,
            completed: true,
          })

        if (error) throw error
        fetchDailyLogs()
      }
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const deleteHabit = async (habitId: string) => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('habits')
                .delete()
                .eq('id', habitId)

              if (error) throw error
              setHabits(habits.filter(h => h.id !== habitId))
            } catch (error: any) {
              Alert.alert('Error', error.message)
            }
          }
        }
      ]
    )
  }

  const handleShare = async () => {
    const shareData = {
      title: 'Habit Tracker',
      message: 'Check out my habit tracking progress',
    }

    try {
      const shareImplementation = Platform.select({
        web: async () => {
          if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share(shareData)
          } else {
            Alert.alert('Share', 'Link copied to clipboard')
          }
        },
        default: async () => {
          const { Share } = await import('react-native')
          await Share.share(shareData)
        }
      })

      if (shareImplementation) {
        await shareImplementation()
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share')
      }
    }
  }

  const getCompletion = (habitId: string) => {
    const log = dailyLogs.find(l => l.habit_id === habitId)
    return log?.completed || false
  }

  const renderHabit = ({ item }: { item: Habit }) => {
    const isCompleted = getCompletion(item.id)

    return (
      <View style={[styles.habitCard, isCompleted && styles.completedCard]}>
        <TouchableOpacity
          style={styles.habitMain}
          onPress={() => toggleHabit(item.id)}
        >
          <View style={[styles.checkbox, isCompleted && styles.checkedCheckbox]}>
            {isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.habitInfo}>
            <Text style={[styles.habitName, isCompleted && styles.completedText]}>{item.name}</Text>
            {item.description && <Text style={styles.habitDescription}>{item.description}</Text>}
            <Text style={styles.frequency}>{item.target_frequency}x {item.frequency_type}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteHabit(item.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Habit Tracker</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
            <Text style={styles.addButtonText}>Add Habit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading habits...</Text>
      ) : habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No habits yet. Start by adding your first habit!</Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          renderItem={renderHabit}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add New Habit</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Habit Name"
            value={habitName}
            onChangeText={setHabitName}
          />

          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={habitDescription}
            onChangeText={setHabitDescription}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Frequency"
              value={targetFrequency}
              onChangeText={setTargetFrequency}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Type (daily/weekly)"
              value={frequencyType}
              onChangeText={setFrequencyType}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={addHabit}
            >
              <Text style={styles.saveButtonText}>Add Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#d2d2d7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1d1d1f',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d2d2d7',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#0071e3',
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#0071e3',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  habitCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  habitMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d2d2d7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#34c759',
    borderColor: '#34c759',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#34c759',
  },
  habitDescription: {
    fontSize: 14,
    color: '#6e6e73',
    marginBottom: 4,
  },
  frequency: {
    fontSize: 12,
    color: '#0071e3',
    backgroundColor: 'rgba(0, 113, 227, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6e6e73',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6e6e73',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1d1d1f',
  },
  input: {
    backgroundColor: '#f5f5f7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d2d2d7',
  },
  cancelButtonText: {
    color: '#0071e3',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0071e3',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
})