import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { File } from 'expo-file-system';
import { Colors, Spacing, Type, Shadows, BorderRadius, BorderWidth, TouchTarget, IconButton, hitSlopFor } from '../src/constants/theme';
import { getDatabase } from '../src/db/database';
import {
  toggleTodoCompleted, toggleItemCompleted,
  deleteTodo, deleteItem, deleteEvent,
  updateDocumentCategory,
  updateTodo, updateItem, updateEvent,
  setEventCalendarId, setTodoTaskId, setItemReminderId,
} from '../src/db/documents';
import {
  registerEventToIOSCalendar, registerReminderToIOS, PermissionDeniedError,
} from '../src/services/native-calendar';
import type { AnalysisResult } from '../src/types';

function renderSummary(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={i} style={{ height: 8 }} />;

    // 箇条書き（・、-、・ で始まる行）
    const bulletMatch = trimmed.match(/^[・\-\u2022\u25CF]\s*(.*)/);
    if (bulletMatch) {
      return (
        <View key={i} style={summaryStyles.bulletRow}>
          <Text style={summaryStyles.bullet}>•</Text>
          <Text style={summaryStyles.bulletText}>{bulletMatch[1]}</Text>
        </View>
      );
    }

    // 見出し風（行末に「:」や「：」がある、または短い行）
    if ((trimmed.endsWith(':') || trimmed.endsWith('：')) && trimmed.length < 30) {
      return <Text key={i} style={summaryStyles.heading}>{trimmed}</Text>;
    }

    // 日時情報（日付や時刻を含む行）
    if (/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}|令和|平成/.test(trimmed)) {
      return (
        <View key={i} style={summaryStyles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
          <Text style={summaryStyles.dateText}>{trimmed}</Text>
        </View>
      );
    }

    return <Text key={i} style={summaryStyles.normalText}>{trimmed}</Text>;
  });
}

const summaryStyles = StyleSheet.create({
  bulletRow: { flexDirection: 'row', paddingLeft: Spacing.xs, marginBottom: Spacing.xs },
  bullet: { ...Type.body, color: Colors.primary, marginRight: Spacing.sm },
  bulletText: { ...Type.body, color: Colors.text, flex: 1 },
  heading: { ...Type.bodyStrong, color: Colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs, paddingLeft: Spacing.xs },
  dateText: { ...Type.bodyMedium, color: Colors.primary },
  normalText: { ...Type.body, color: Colors.text, marginBottom: Spacing.xs },
});

export default function AnalysisResultScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<{
    type: 'todo' | 'item' | 'event';
    id: number;
    title: string;
    dueDate: string;
    description: string;
  } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const openEditModal = (type: 'todo' | 'item' | 'event', item: any) => {
    setEditModal({
      type,
      id: item.id,
      title: type === 'item' ? item.name : item.title,
      dueDate: (type === 'event' ? item.date : item.due_date) || '',
      description: item.description || '',
    });
  };

  const saveEdit = async () => {
    if (!editModal) return;
    const { type, id, title, dueDate, description } = editModal;
    if (type === 'todo') {
      await updateTodo(id, { title, dueDate: dueDate || null, description });
    } else if (type === 'item') {
      await updateItem(id, { name: title, dueDate: dueDate || null, description });
    } else {
      await updateEvent(id, { title, date: dueDate || undefined, description });
    }
    setEditModal(null);
    loadData();
  };

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const docRow = await db.getFirstAsync<any>('SELECT * FROM documents WHERE id = ?', [Number(docId)]);
    if (docRow) setDoc(docRow);
    setEvents(await db.getAllAsync<any>('SELECT * FROM events WHERE document_id = ? ORDER BY date, start_time', [Number(docId)]));
    setTodos(await db.getAllAsync<any>('SELECT * FROM todos WHERE document_id = ?', [Number(docId)]));
    setItems(await db.getAllAsync<any>('SELECT * FROM items WHERE document_id = ?', [Number(docId)]));
  }, [docId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleCategory = async () => {
    if (!doc) return;
    const newCat = doc.category === 'action_required' ? 'notice' : 'action_required';
    await updateDocumentCategory(doc.id, newCat);
    loadData();
  };

  // --- iOSカレンダー / リマインダー登録（v1.1） ---
  const [registeringIds, setRegisteringIds] = useState<Set<string>>(new Set());

  const markRegistering = (key: string, on: boolean) => {
    setRegisteringIds(prev => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  };

  const handleRegisterError = (e: any) => {
    if (e instanceof PermissionDeniedError) {
      Alert.alert(
        '許可が必要です',
        e.entity === 'calendar'
          ? 'カレンダーへの追加が許可されていません。設定アプリから許可してください。'
          : 'リマインダーへのアクセスが許可されていません。設定アプリから許可してください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '設定を開く', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      Alert.alert('登録エラー', e?.message ?? '登録に失敗しました');
    }
  };

  const registerEvent = async (e: any) => {
    const key = `event-${e.id}`;
    if (registeringIds.has(key)) return;
    markRegistering(key, true);
    try {
      const calId = await registerEventToIOSCalendar({
        title: e.title, date: e.date, startTime: e.start_time, endTime: e.end_time,
        location: e.location, targetPerson: e.target_person, description: e.description,
      });
      await setEventCalendarId(e.id, calId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (err) {
      handleRegisterError(err);
    } finally {
      markRegistering(key, false);
    }
  };

  const registerTodoOrItem = async (kind: 'todo' | 'item', t: any) => {
    const key = `${kind}-${t.id}`;
    if (registeringIds.has(key)) return;
    markRegistering(key, true);
    try {
      const remId = await registerReminderToIOS({
        title: kind === 'item' ? t.name : t.title,
        dueDate: t.due_date, targetPerson: t.target_person, description: t.description,
      });
      if (kind === 'todo') await setTodoTaskId(t.id, remId);
      else await setItemReminderId(t.id, remId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (err) {
      handleRegisterError(err);
    } finally {
      markRegistering(key, false);
    }
  };

  const registerAllEvents = async () => {
    const targets = events.filter((e: any) => !e.calendar_event_id);
    let ok = 0;
    for (const e of targets) {
      try {
        const calId = await registerEventToIOSCalendar({
          title: e.title, date: e.date, startTime: e.start_time, endTime: e.end_time,
          location: e.location, targetPerson: e.target_person, description: e.description,
        });
        await setEventCalendarId(e.id, calId);
        ok++;
      } catch (err) {
        handleRegisterError(err);
        break; // 権限エラー等は連打しない
      }
    }
    if (ok > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadData();
  };

  const registerAllReminders = async () => {
    const targets = [
      ...todos.filter((t: any) => !t.task_id).map((t: any) => ({ kind: 'todo' as const, row: t })),
      ...items.filter((i: any) => !i.reminder_id).map((i: any) => ({ kind: 'item' as const, row: i })),
    ];
    let ok = 0;
    for (const { kind, row } of targets) {
      try {
        const remId = await registerReminderToIOS({
          title: kind === 'item' ? row.name : row.title,
          dueDate: row.due_date, targetPerson: row.target_person, description: row.description,
        });
        if (kind === 'todo') await setTodoTaskId(row.id, remId);
        else await setItemReminderId(row.id, remId);
        ok++;
      } catch (err) {
        handleRegisterError(err);
        break;
      }
    }
    if (ok > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadData();
  };

  const handleDeleteEvent = (id: number, title: string) => {
    Alert.alert('削除確認', `「${title}」を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteEvent(id); loadData(); } },
    ]);
  };

  const handleDeleteTodo = (id: number, title: string) => {
    Alert.alert('削除確認', `「${title}」を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteTodo(id); loadData(); } },
    ]);
  };

  const handleDeleteItem = (id: number, name: string) => {
    Alert.alert('削除確認', `「${name}」を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteItem(id); loadData(); } },
    ]);
  };

  if (!doc) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.badgeContainer}
          onPress={handleToggleCategory}
          activeOpacity={0.7}
          accessibilityLabel="カテゴリを変更"
          accessibilityRole="button"
        >
          <Ionicons
            name={doc.category === 'action_required' ? 'alert-circle-outline' : 'information-circle-outline'}
            size={14}
            color={doc.category === 'action_required' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[
            styles.badge,
            doc.category === 'action_required' ? styles.badgeAction : styles.badgeNotice,
          ]}>
            {doc.category === 'action_required' ? '要対応' : 'お知らせ'}
          </Text>
          <Ionicons name="swap-horizontal" size={12} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{doc.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meta}>{doc.source}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="document-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meta}>{doc.file_name}</Text>
        </View>

        {/* 元資料リンク */}
        <View style={styles.sourceLinks}>
          {doc.file_path ? (
            <TouchableOpacity
              style={styles.sourceLinkButton}
              onPress={async () => {
                try {
                  const file = new File(doc.file_path);
                  if (file.exists) {
                    // QuickLookでプレビュー表示
                    await Linking.openURL(doc.file_path);
                  } else {
                    Alert.alert('ファイルなし', 'ローカルのファイルが見つかりません。再スキャンしてください。');
                  }
                } catch {
                  Alert.alert('エラー', 'ファイルを開けませんでした');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
              <Text style={styles.sourceLinkText}>元資料を開く</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="reader-outline" size={18} color={Colors.text} />
          <Text style={styles.sectionTitle}>要約</Text>
        </View>
        <View style={styles.summaryCard}>
          {renderSummary(doc.summary)}
        </View>
      </View>

      {/* Events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={Colors.text} />
            <Text style={styles.sectionTitle}>イベント ({events.length}件)</Text>
            <View style={{ flex: 1 }} />
            {Platform.OS === 'ios' && events.some((e: any) => !e.calendar_event_id) && (
              <TouchableOpacity
                style={styles.bulkButton}
                onPress={registerAllEvents}
                activeOpacity={0.7}
                accessibilityLabel="すべてのイベントをカレンダーに登録"
                accessibilityRole="button"
              >
                <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
                <Text style={styles.bulkButtonText}>すべて登録</Text>
              </TouchableOpacity>
            )}
          </View>
          {events.map((e: any) => (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                  <TouchableOpacity style={styles.cardContent} onPress={() => openEditModal('event', e)} activeOpacity={0.6}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{e.title}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {e.target_person} / {e.date}{e.start_time ? ` ${e.start_time}` : ''}
                      {e.end_time ? `~${e.end_time}` : ''}
                    </Text>
                    {e.location ? (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.cardMeta}>{e.location}</Text>
                      </View>
                    ) : null}
                    {e.description ? <Text style={styles.cardDesc}>{e.description}</Text> : null}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteEvent(e.id, e.title)}
                  accessibilityLabel={`${e.title}を削除`}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' && (
                e.calendar_event_id ? (
                  <View style={styles.registeredChip}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.registeredChipText}>カレンダーに登録済み</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.registerChip}
                    onPress={() => registerEvent(e)}
                    disabled={registeringIds.has(`event-${e.id}`)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${e.title}をカレンダーに登録`}
                    accessibilityRole="button"
                  >
                    {registeringIds.has(`event-${e.id}`) ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                    )}
                    <Text style={styles.registerChipText}>カレンダーに登録</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
        </View>
      )}

      {/* TODOs */}
      {todos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkbox-outline" size={18} color={Colors.text} />
            <Text style={styles.sectionTitle}>TODO ({todos.length}件)</Text>
            <View style={{ flex: 1 }} />
            {Platform.OS === 'ios' && (todos.some((t: any) => !t.task_id) || items.some((i: any) => !i.reminder_id)) && (
              <TouchableOpacity
                style={styles.bulkButton}
                onPress={registerAllReminders}
                activeOpacity={0.7}
                accessibilityLabel="TODOと持ち物をすべてリマインダーに登録"
                accessibilityRole="button"
              >
                <Ionicons name="alarm-outline" size={13} color={Colors.primary} />
                <Text style={styles.bulkButtonText}>すべて登録</Text>
              </TouchableOpacity>
            )}
          </View>
          {todos.map((t: any) => (
            <View key={t.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={async () => { await toggleTodoCompleted(t.id); loadData(); }}
                    accessibilityLabel={t.is_completed ? `${t.title}を未完了に戻す` : `${t.title}を完了にする`}
                  >
                    <Ionicons
                      name={t.is_completed ? 'checkbox-outline' : 'square-outline'}
                      size={22}
                      color={t.is_completed ? Colors.text : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardContent} onPress={() => openEditModal('todo', t)} activeOpacity={0.6}>
                    <Text style={[styles.cardTitle, t.is_completed && styles.completedText]}>{t.title}</Text>
                    <Text style={styles.cardMeta}>
                      {t.target_person}{t.due_date ? ` / 期限: ${t.due_date}` : ''}
                    </Text>
                    {t.description ? <Text style={styles.cardDesc}>{t.description}</Text> : null}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteTodo(t.id, t.title)}
                  accessibilityLabel={`${t.title}を削除`}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' && !t.is_completed && (
                t.task_id ? (
                  <View style={styles.registeredChip}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.registeredChipText}>リマインダーに登録済み</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.registerChip}
                    onPress={() => registerTodoOrItem('todo', t)}
                    disabled={registeringIds.has(`todo-${t.id}`)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${t.title}をリマインダーに登録`}
                    accessibilityRole="button"
                  >
                    {registeringIds.has(`todo-${t.id}`) ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                    )}
                    <Text style={styles.registerChipText}>リマインダーに登録</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
        </View>
      )}

      {/* Items */}
      {items.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bag-handle-outline" size={18} color={Colors.text} />
            <Text style={styles.sectionTitle}>持ち物 ({items.length}件)</Text>
          </View>
          {items.map((i: any) => (
            <View key={i.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={async () => { await toggleItemCompleted(i.id); loadData(); }}
                    accessibilityLabel={i.is_completed ? `${i.name}を未完了に戻す` : `${i.name}を完了にする`}
                  >
                    <Ionicons
                      name={i.is_completed ? 'checkbox-outline' : 'square-outline'}
                      size={22}
                      color={i.is_completed ? Colors.text : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardContent} onPress={() => openEditModal('item', i)} activeOpacity={0.6}>
                    <Text style={[styles.cardTitle, i.is_completed && styles.completedText]}>{i.name}</Text>
                    <Text style={styles.cardMeta}>
                      {i.target_person}{i.due_date ? ` / 期限: ${i.due_date}` : ''}
                    </Text>
                    {i.description ? <Text style={styles.cardDesc}>{i.description}</Text> : null}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteItem(i.id, i.name)}
                  accessibilityLabel={`${i.name}を削除`}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' && !i.is_completed && (
                i.reminder_id ? (
                  <View style={styles.registeredChip}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.registeredChipText}>リマインダーに登録済み</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.registerChip}
                    onPress={() => registerTodoOrItem('item', i)}
                    disabled={registeringIds.has(`item-${i.id}`)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${i.name}をリマインダーに登録`}
                    accessibilityRole="button"
                  >
                    {registeringIds.has(`item-${i.id}`) ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                    )}
                    <Text style={styles.registerChipText}>リマインダーに登録</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
        </View>
      )}

      {/* No extracted items */}
      {events.length === 0 && todos.length === 0 && items.length === 0 && (
        <View style={styles.section}>
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>抽出された項目はありません</Text>
            <Text style={styles.emptyText}>このプリントからイベント・TODO・持ち物は検出されませんでした</Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Edit Modal */}
      <Modal visible={!!editModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editModal?.type === 'todo' ? 'TODO編集' : editModal?.type === 'item' ? '持ち物編集' : 'イベント編集'}
              </Text>
              <TouchableOpacity onPress={() => setEditModal(null)} hitSlop={hitSlopFor(24, 24)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>
              {editModal?.type === 'item' ? '名前' : 'タイトル'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editModal?.title || ''}
              onChangeText={(v) => setEditModal(prev => prev ? { ...prev, title: v } : null)}
              placeholder="タイトル"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.modalLabel}>
              {editModal?.type === 'event' ? '日付' : '期限'}
            </Text>
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={editModal?.dueDate ? styles.modalValue : styles.modalPlaceholder}>
                {editModal?.dueDate || '日付を選択'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={editModal?.dueDate ? new Date(editModal.dueDate + 'T00:00:00') : new Date()}
                mode="date"
                display="inline"
                locale="ja-JP"
                onChange={(_, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const y = selectedDate.getFullYear();
                    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const d = String(selectedDate.getDate()).padStart(2, '0');
                    setEditModal(prev => prev ? { ...prev, dueDate: `${y}-${m}-${d}` } : null);
                  }
                }}
              />
            )}

            <Text style={styles.modalLabel}>説明</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editModal?.description || ''}
              onChangeText={(v) => setEditModal(prev => prev ? { ...prev, description: v } : null)}
              placeholder="説明"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.modalSaveButton} onPress={saveEdit} activeOpacity={0.7}>
              <Ionicons name="checkmark" size={20} color={Colors.onPrimary} />
              <Text style={styles.modalSaveText}>保存</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { ...Type.caption, color: Colors.textSecondary, marginTop: Spacing.sm },
  header: {
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderBottomWidth: BorderWidth.thin, borderBottomColor: Colors.border,
  },
  badgeContainer: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: Spacing.xs, minHeight: TouchTarget.min,
    marginBottom: Spacing.sm,
  },
  badge: { ...Type.captionStrong },
  badgeAction: { color: Colors.primary },
  badgeNotice: { color: Colors.textSecondary },
  title: { ...Type.title, color: Colors.text, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  meta: { ...Type.caption, color: Colors.textSecondary },
  section: { padding: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { ...Type.sectionTitle, color: Colors.text },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    ...Shadows.card,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  cardMain: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  iconButton: { ...IconButton },
  bulkButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, minHeight: TouchTarget.min,
    borderRadius: BorderRadius.sm, borderWidth: BorderWidth.thin, borderColor: Colors.primary,
    backgroundColor: Colors.transparent,
  },
  bulkButtonText: { ...Type.captionStrong, color: Colors.primary },
  registerChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm, paddingHorizontal: Spacing.sm, minHeight: TouchTarget.min,
    borderRadius: BorderRadius.sm, borderWidth: BorderWidth.thin, borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  registerChipText: { ...Type.captionStrong, color: Colors.primary },
  registeredChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    alignSelf: 'flex-start', marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  registeredChipText: { ...Type.captionStrong, color: Colors.textSecondary },
  cardContent: { flex: 1, minHeight: TouchTarget.min },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { ...Type.bodyMedium, color: Colors.text, flex: 1 },
  completedText: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  cardMeta: { ...Type.caption, color: Colors.textSecondary, marginTop: 1 },
  cardDesc: { ...Type.caption, color: Colors.text, marginTop: Spacing.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  emptyState: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  emptyTitle: { ...Type.bodyStrong, color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyText: { ...Type.caption, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  sourceLinks: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  sourceLinkButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, minHeight: TouchTarget.min,
    borderRadius: BorderRadius.sm, borderWidth: BorderWidth.thin, borderColor: Colors.primary,
    backgroundColor: Colors.transparent,
  },
  sourceLinkText: { ...Type.captionMedium, color: Colors.primary },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.scrim,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg, paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { ...Type.sectionTitle, color: Colors.text },
  modalLabel: {
    ...Type.captionMedium, color: Colors.textSecondary,
    marginTop: Spacing.sm, marginBottom: Spacing.xs,
  },
  modalInput: {
    borderWidth: BorderWidth.thin, borderColor: Colors.border, borderRadius: BorderRadius.sm,
    padding: Spacing.sm, minHeight: TouchTarget.min, justifyContent: 'center',
    ...Type.body, color: Colors.text,
    backgroundColor: Colors.background,
  },
  modalValue: { ...Type.body, color: Colors.text },
  modalPlaceholder: { ...Type.body, color: Colors.textSecondary },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  modalSaveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md,
    marginTop: Spacing.lg, gap: Spacing.sm, minHeight: TouchTarget.min,
  },
  modalSaveText: { ...Type.bodyStrong, color: Colors.onPrimary },
});
