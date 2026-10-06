import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MarkdownText({ content, textColor = '#111827', theme }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <View key={idx} style={{ height: 6 }} />;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <Text key={idx} style={[styles.h3, { color: textColor }]}>
              {renderInlineBold(trimmed.substring(4), textColor)}
            </Text>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={idx} style={[styles.h2, { color: textColor }]}>
              {renderInlineBold(trimmed.substring(3), textColor)}
            </Text>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={idx} style={[styles.h1, { color: textColor }]}>
              {renderInlineBold(trimmed.substring(2), textColor)}
            </Text>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <View key={idx} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme ? theme.primary : textColor }]}>•</Text>
              <Text style={[styles.bulletText, { color: textColor }]}>
                {renderInlineBold(trimmed.substring(2), textColor)}
              </Text>
            </View>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <View key={idx} style={styles.bulletRow}>
              <Text style={[styles.numText, { color: theme ? theme.primary : textColor }]}>
                {numMatch[1]}.
              </Text>
              <Text style={[styles.bulletText, { color: textColor }]}>
                {renderInlineBold(numMatch[2], textColor)}
              </Text>
            </View>
          );
        }

        // Standard paragraph
        return (
          <Text key={idx} style={[styles.paragraph, { color: textColor }]}>
            {renderInlineBold(line, textColor)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInlineBold(text, color) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={[styles.bold, { color }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  h1: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  numText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});
