/**
 * 통합 노트 렌더러
 * 단일 컬럼 연속 문서 형태의 노트 뷰어
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NoteData, NoteBlock } from './types';
import { NoteBlockRenderer } from './NoteBlockRenderer';

interface NoteRendererProps {
  data: NoteData;
  scrollRef?: React.RefObject<ScrollView>;
  onScroll?: (event: any) => void;
}

export function NoteRenderer({ data, scrollRef, onScroll }: NoteRendererProps) {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {data.blocks.map((block, index) => (
        <NoteBlockRenderer key={block.id || index} block={block} index={index} />
      ))}

      {/* 하단 여백 */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
