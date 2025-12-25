import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { MainContentBlock } from './MainContentBlock';
import { CornellNoteData } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 넓은 캔버스 (화면의 2배)
const CANVAS_WIDTH = SCREEN_WIDTH * 2;

interface Props {
  data: CornellNoteData;
  date?: string;
  subject?: string;
}

export function CornellCanvas({ data, date, subject }: Props) {
  const [currentZoom, setCurrentZoom] = useState(0.5);
  const zoomableViewRef = useRef<any>(null);
  const [activeCueIndex, setActiveCueIndex] = useState<number | undefined>(undefined);

  const handleZoomReset = useCallback(() => {
    zoomableViewRef.current?.zoomTo(0.5);
    setCurrentZoom(0.5);
  }, []);

  const handleCuePress = useCallback((index: number) => {
    setActiveCueIndex(index);
  }, []);

  const handleZoomChange = useCallback((_: any, __: any, zoomableViewEventObject: any) => {
    setCurrentZoom(zoomableViewEventObject.zoomLevel);
  }, []);

  const cueColumnWidth = CANVAS_WIDTH * 0.22;
  const mainContentWidth = CANVAS_WIDTH * 0.78 - 4;

  return (
    <View style={styles.wrapper}>
      {/* 줌 컨트롤 */}
      <View style={styles.zoomControls}>
        <Text style={styles.zoomText}>{Math.round(currentZoom * 100)}%</Text>
        <TouchableOpacity style={styles.zoomResetBtn} onPress={handleZoomReset}>
          <Text style={styles.zoomResetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* 줌 가능한 캔버스 */}
      <ReactNativeZoomableView
        ref={zoomableViewRef}
        maxZoom={2}
        minZoom={0.3}
        initialZoom={0.5}
        bindToBorders={false}
        panBoundaryPadding={200}
        onZoomAfter={handleZoomChange}
        style={styles.zoomableContainer}
      >
        {/* 캔버스 */}
        <View style={[styles.canvas, { width: CANVAS_WIDTH }]}>

          {/* 헤더 영역 */}
          <View style={styles.headerSection}>
            <Text style={styles.titleText}>{data.title}</Text>
            <View style={styles.metaRow}>
              {date && <Text style={styles.metaText}>{date}</Text>}
              {subject && <Text style={styles.subjectText}>{subject}</Text>}
            </View>
          </View>

          {/* 코넬식 메인 영역 */}
          <View style={styles.cornellArea}>
            {/* 왼쪽: 키워드 영역 */}
            <View style={[styles.cueSection, { width: cueColumnWidth }]}>
              <Text style={styles.sectionLabel}>KEYWORDS</Text>
              {data.cues.map((cue, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.cueItem,
                    activeCueIndex === index && styles.cueItemActive
                  ]}
                  onPress={() => handleCuePress(index)}
                >
                  <Text style={styles.cueText}>{cue}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 빨간 구분선 */}
            <View style={styles.divider} />

            {/* 오른쪽: 본문 영역 */}
            <View style={[styles.mainSection, { width: mainContentWidth }]}>
              {/* 줄 노트 배경 */}
              <View style={styles.linesBackground}>
                {Array.from({ length: 100 }).map((_, i) => (
                  <View key={i} style={styles.noteLine} />
                ))}
              </View>

              {/* 본문 */}
              <View style={styles.mainContent}>
                <MainContentBlock blocks={data.main} />
              </View>
            </View>
          </View>

          {/* 요약 영역 */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionLabel}>SUMMARY</Text>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>

        </View>
      </ReactNativeZoomableView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#9CA3AF',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6B7280',
    gap: 12,
  },
  zoomText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  zoomResetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4B5563',
    borderRadius: 6,
  },
  zoomResetText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  zoomableContainer: {
    flex: 1,
  },
  canvas: {
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: '#9CA3AF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerSection: {
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderBottomWidth: 3,
    borderBottomColor: '#1E3A8A',
    backgroundColor: '#FAFAFA',
  },
  titleText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  metaText: {
    fontSize: 16,
    color: '#6B7280',
  },
  subjectText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  cornellArea: {
    flexDirection: 'row',
    minHeight: 600,
  },
  cueSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  cueItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 8,
  },
  cueItemActive: {
    backgroundColor: '#DBEAFE',
  },
  cueText: {
    fontSize: 18,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '500',
  },
  divider: {
    width: 4,
    backgroundColor: '#DC2626',
  },
  mainSection: {
    position: 'relative',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  linesBackground: {
    position: 'absolute',
    top: 24,
    left: 32,
    right: 32,
    zIndex: 0,
  },
  noteLine: {
    height: 1,
    backgroundColor: '#BFDBFE',
    marginBottom: 34,
    opacity: 0.6,
  },
  mainContent: {
    position: 'relative',
    zIndex: 2,
  },
  summarySection: {
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderTopWidth: 3,
    borderTopColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
    minHeight: 150,
  },
  summaryText: {
    fontSize: 20,
    color: '#1E3A8A',
    lineHeight: 32,
    fontWeight: '500',
  },
});

export default CornellCanvas;
