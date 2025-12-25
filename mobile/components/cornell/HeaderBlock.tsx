import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HeaderBlockProps } from './types';

export function HeaderBlock({ title, date, subject }: HeaderBlockProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metaRow}>
        {date && <Text style={styles.meta}>{date}</Text>}
        {subject && <Text style={styles.subject}>{subject}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1F2937',
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    fontSize: 13,
    color: '#6B7280',
  },
  subject: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
