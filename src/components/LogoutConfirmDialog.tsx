/* eslint-disable prettier/prettier */
/**
 * LogoutConfirmDialog — "Log out" confirmation card, per Figma.
 *
 * Rendered as a plain in-screen overlay instead of a native <Modal> (same
 * reasoning as NotificationPermissionModal: RN's iOS Modal presents via
 * presentViewController and can throw when opened mid-transition). Mount it
 * as the LAST child of a full-screen container so it sits above siblings.
 *
 * Usage:
 *   <LogoutConfirmDialog
 *     visible={showLogout}
 *     onCancel={() => setShowLogout(false)}
 *     onConfirm={handleConfirmLogout}
 *   />
 *
 * `gap` is avoided on purpose (unreliable on Android/Hermes) — spacing is
 * done with margins to match the Figma gap values (20 between text/buttons,
 * 8 between title/body and between the two buttons).
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const NAVY = '#192546';
const DARK_BLUE = '#0C4D91';
const GREY = '#71727A';
const GREY_LIGHT = '#8F9098';

interface LogoutConfirmDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutConfirmDialog = ({visible, onCancel, onConfirm}: LogoutConfirmDialogProps) => {
  if (!visible) return null;

  return (
    <View style={s.overlay}>
      {/* Tapping the dimmed backdrop = Cancel. */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onCancel} />

      <View style={s.card}>
        <View style={s.textBlock}>
          <Text style={s.title}>{'Log out'}</Text>
          <Text style={s.message}>
            {"Are you sure you want to log out? You'll need to login again to use the app."}
          </Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.cancelText}>{'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.logoutBtn]} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={s.logoutText}>{'Log out'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // width:300; padding:16; radius:8.201; shadow 0 0 10.023 -1.822 rgba(0,0,0,.15)
  card: {
    width: 300,
    padding: 16,
    borderRadius: 8.201,
    backgroundColor: '#FFFFFF',
    // iOS shadow
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 5,
    // Android shadow
    elevation: 10001,
  },

  textBlock: {alignSelf: 'stretch', marginBottom: 20},
  title: {
    color: NAVY,
    textAlign: 'center',
    fontFamily: 'Runda-Bold',
    fontSize: 18,
    letterSpacing: 0.09,
  },
  message: {
    color: GREY,
    textAlign: 'center',
    fontFamily: 'Runda-Normal',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },

  actions: {flexDirection: 'row', alignSelf: 'stretch'},
  btn: {
    flex: 1,
    height: 40,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: GREY_LIGHT,
  },
  cancelText: {
    color: GREY_LIGHT,
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
  logoutBtn: {backgroundColor: DARK_BLUE},
  logoutText: {
    color: '#FFFFFF',
    fontFamily: 'Runda-Medium',
    fontSize: 12,
  },
});

export default LogoutConfirmDialog;
