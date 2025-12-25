import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SummaryBlockProps } from './types';

export function SummaryBlock({ summary }: SummaryBlockProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Summary</Text>
      <Text style={styles.text}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    borderTopColor: '#1F2937',
    backgroundColor: '#F3F4F6',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  text: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 24,
    fontWeight: '500',
  },
});
