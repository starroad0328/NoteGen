import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CueColumnProps } from './types';

export function CueColumn({ cues, onCuePress, activeCueIndex }: CueColumnProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Keywords</Text>
      {cues.map((cue, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.cueItem,
            activeCueIndex === index && styles.cueItemActive
          ]}
          onPress={() => onCuePress?.(index)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.cueText,
            activeCueIndex === index && styles.cueTextActive
          ]}>
            {cue}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cueItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  cueItemActive: {
    backgroundColor: '#DBEAFE',
  },
  cueText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  cueTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
