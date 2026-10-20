/* eslint-disable prettier/prettier */
// Webinar "Filter by Category" — uses the shared Forums-style sheet.
import React from 'react';
import {MultiFilterSheet} from './forumStyleControls';
import {WEBINAR_TAGS} from '../api/eventsApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedTags: string[];
  onApply: (tags: string[]) => void;
}

const WebinarFilterSheet = ({visible, onClose, selectedTags, onApply}: Props) => (
  <MultiFilterSheet
    visible={visible}
    title="Filter by Category"
    sectionLabel="Topics"
    items={WEBINAR_TAGS.map(t => ({id: t.slug, label: t.name}))}
    selectedIds={selectedTags}
    onApply={onApply}
    onClose={onClose}
  />
);

export default WebinarFilterSheet;
