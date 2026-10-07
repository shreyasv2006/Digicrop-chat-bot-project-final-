import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DCLogo({ size = 36, theme }) {
  const primaryColor = theme?.primary || '#10b981';
  const fontSize = Math.round(size * 0.44);
  const borderRadius = Math.round(size * 0.25);

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          backgroundColor: primaryColor, 
          borderRadius: borderRadius,
        }
      ]}
    >
      <Text style={[styles.text, { fontSize: fontSize }]}>DC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
