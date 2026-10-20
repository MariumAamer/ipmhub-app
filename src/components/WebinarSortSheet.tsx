/* eslint-disable prettier/prettier */
// Webinar "Sort by" — uses the shared Forums-style sort sheet.
import React from 'react';
import {SortSheet} from './forumStyleControls';
import {WEBINAR_SORT_OPTIONS, WebinarSort} from '../api/eventsApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  selected: WebinarSort;
  onSelect: (value: WebinarSort) => void;
}

const WebinarSortSheet = ({visible, onClose, selected, onSelect}: Props) => (
  <SortSheet
    visible={visible}
    options={WEBINAR_SORT_OPTIONS.map(o => ({id: o.value, label: o.label}))}
    selectedId={selected}
    onSelect={id => onSelect(id as WebinarSort)}
    onClose={onClose}
  />
);

export default WebinarSortSheet;
