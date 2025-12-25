import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MainContentBlockProps, MainBlock } from './types';

export function MainContentBlock({ blocks }: MainContentBlockProps) {
  console.log('[MainContentBlock] blocks:', blocks?.length, blocks);

  if (!blocks || blocks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.paragraph}>내용이 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => (
        <View key={index} style={styles.blockWrapper}>
          {renderBlock(block)}
        </View>
      ))}
    </View>
  );
}

function renderBlock(block: MainBlock) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={block.level === 2 ? styles.heading2 : styles.heading3}>
          {block.content}
        </Text>
      );

    case 'paragraph':
      return <Text style={styles.paragraph}>{block.content}</Text>;

    case 'bullet':
      return (
        <View style={styles.bulletList}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case 'important':
      return (
        <View style={styles.importantBox}>
          <Text style={styles.importantText}>{block.content}</Text>
        </View>
      );

    case 'example':
      return (
        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>Example</Text>
          <Text style={styles.exampleText}>{block.content}</Text>
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  blockWrapper: {
    marginBottom: 12,
  },
  heading2: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  heading3: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 20,
    color: '#374151',
    lineHeight: 32,
  },
  bulletList: {
    marginLeft: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  importantBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  importantText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 22,
  },
  exampleBox: {
    backgroundColor: '#EDE9FE',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: '#5B21B6',
    lineHeight: 21,
  },
});
