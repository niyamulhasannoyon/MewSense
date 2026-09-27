import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { offlineQueue } from './src/services/offlineQueue';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'cats'>('record');

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setSeconds(0);
      setHasRecording(false);
      setResult(null);
    } else {
      setIsRecording(false);
      setHasRecording(true);
    }
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate background inference turnaround with calibrated response
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult({
        primarySound: 'MEOW',
        probableContext: 'HUNGRY / FOOD-SEEKING',
        confidence: 86,
        isDistress: false,
        duration: `${seconds || 1.4}s`,
        pitch: '540 Hz',
        explanation: 'Rising harmonic frequency contour characteristic of solicitation meows. High probability of food-seeking behavior.',
        disclaimer: 'This is an AI-generated probabilistic interpretation, not a literal translation or veterinary diagnosis.'
      });
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🐱</Text>
          <Text style={styles.headerTitle}>MewSense</Text>
        </View>
        <Text style={styles.headerSubtitle}>Understand the Sound, Not Just the Meow</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'record' && (
          <View style={styles.tabContent}>
            {/* Visualizer Card */}
            <View style={styles.visualizerCard}>
              <Text style={styles.visualizerHint}>
                {isRecording ? '🔴 Listening for cat vocalizations...' : 'Microphone Ready'}
              </Text>
              <Text style={styles.timerText}>
                {Math.floor(seconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(seconds % 60).toString().padStart(2, '0')}
              </Text>

              {/* Waveform bars representation */}
              <View style={styles.waveformContainer}>
                {[20, 45, 70, 30, 85, 60, 40, 95, 30, 50, 75, 20].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveformBar,
                      {
                        height: isRecording ? Math.min(60, h * (seconds % 3 + 1) * 0.4) : 8,
                        backgroundColor: isRecording ? '#f97316' : '#3f3f46'
                      }
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Record Action Button */}
            <TouchableOpacity
              onPress={toggleRecording}
              style={[
                styles.recordButton,
                isRecording ? styles.recordButtonActive : styles.recordButtonIdle
              ]}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? '⏹ Stop Recording' : '🎙 Record Cat Sound'}
              </Text>
            </TouchableOpacity>

            {hasRecording && !result && (
              <TouchableOpacity
                onPress={runAnalysis}
                disabled={isAnalyzing}
                style={styles.analyzeButton}
              >
                <Text style={styles.analyzeButtonText}>
                  {isAnalyzing ? '✨ Running AI Inference...' : '✨ Analyze Sound'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Results Display */}
            {result && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View>
                    <Text style={styles.resultSound}>{result.primarySound}</Text>
                    <Text style={styles.resultContext}>{result.probableContext}</Text>
                  </View>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>{result.confidence}%</Text>
                    <Text style={styles.confidenceSub}>Confidence</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Acoustic Characteristics</Text>
                <Text style={styles.metaText}>• Duration: {result.duration}</Text>
                <Text style={styles.metaText}>• Mean Pitch (F0): {result.pitch}</Text>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Scientific Rationale</Text>
                <Text style={styles.explanationText}>{result.explanation}</Text>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerText}>⚠️ {result.disclaimer}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Analysis History</Text>
            <View style={styles.historyCard}>
              <Text style={styles.historyCat}>🐱 Mochi • 78% confidence</Text>
              <Text style={styles.historySub}>Meow · Attention-seeking</Text>
              <Text style={styles.historyTime}>Today, 08:30 AM</Text>
            </View>
            <View style={styles.historyCard}>
              <Text style={styles.historyCat}>🐱 Luna • 91% confidence</Text>
              <Text style={styles.historySub}>Purr · Greeting / Social</Text>
              <Text style={styles.historyTime}>Yesterday, 07:15 PM</Text>
            </View>
          </View>
        )}

        {activeTab === 'cats' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Cat Companions</Text>
            <View style={styles.historyCard}>
              <Text style={styles.historyCat}>🐱 Mochi (Scottish Fold)</Text>
              <Text style={styles.historySub}>Female • Spayed</Text>
            </View>
            <View style={styles.historyCard}>
              <Text style={styles.historyCat}>🐱 Luna (Domestic Shorthair)</Text>
              <Text style={styles.historySub}>Female • Spayed</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => setActiveTab('record')}
          style={[styles.navItem, activeTab === 'record' && styles.navItemActive]}
        >
          <Text style={styles.navText}>🎙 Record</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={[styles.navItem, activeTab === 'history' && styles.navItemActive]}
        >
          <Text style={styles.navText}>📋 History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('cats')}
          style={[styles.navItem, activeTab === 'cats' && styles.navItemActive]}
        >
          <Text style={styles.navText}>🐱 Cats</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandIcon: {
    fontSize: 24
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2
  },
  content: {
    padding: 20
  },
  tabContent: {
    gap: 16
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8
  },
  visualizerCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a'
  },
  visualizerHint: {
    fontSize: 12,
    color: '#a1a1aa',
    marginBottom: 8
  },
  timerText: {
    fontSize: 32,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    gap: 6
  },
  waveformBar: {
    width: 6,
    borderRadius: 4
  },
  recordButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  recordButtonIdle: {
    backgroundColor: '#ea580c'
  },
  recordButtonActive: {
    backgroundColor: '#dc2626'
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  analyzeButton: {
    backgroundColor: '#27272a',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46'
  },
  analyzeButtonText: {
    color: '#fdba74',
    fontSize: 14,
    fontWeight: '600'
  },
  resultCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultSound: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '600'
  },
  resultContext: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2
  },
  confidenceBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center'
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f97316'
  },
  confidenceSub: {
    fontSize: 9,
    color: '#a1a1aa'
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 14
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  metaText: {
    fontSize: 12,
    color: '#d4d4d8',
    marginBottom: 2
  },
  explanationText: {
    fontSize: 12,
    color: '#e4e4e7',
    lineHeight: 18
  },
  disclaimerBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14
  },
  disclaimerText: {
    fontSize: 11,
    color: '#fde68a',
    lineHeight: 16
  },
  historyCard: {
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  historyCat: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  historySub: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2
  },
  historyTime: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#09090b',
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12
  },
  navItemActive: {
    backgroundColor: '#18181b'
  },
  navText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600'
  }
});
