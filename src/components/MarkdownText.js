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
              {renderFormattedText(trimmed.substring(4), textColor, theme)}
            </Text>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={idx} style={[styles.h2, { color: textColor }]}>
              {renderFormattedText(trimmed.substring(3), textColor, theme)}
            </Text>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={idx} style={[styles.h1, { color: textColor }]}>
              {renderFormattedText(trimmed.substring(2), textColor, theme)}
            </Text>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <View key={idx} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme ? theme.primary : textColor }]}>•</Text>
              <Text style={[styles.bulletText, { color: textColor }]}>
                {renderFormattedText(trimmed.substring(2), textColor, theme)}
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
                {renderFormattedText(numMatch[2], textColor, theme)}
              </Text>
            </View>
          );
        }

        // Standard paragraph
        return (
          <Text key={idx} style={[styles.paragraph, { color: textColor }]}>
            {renderFormattedText(line, textColor, theme)}
          </Text>
        );
      })}
    </View>
  );
}

function renderFormattedText(text, color, theme) {
  // Regex splits on bold (**text**), code (`text`), and italics (*text*)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={[styles.bold, { color }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={i} style={[styles.code, { backgroundColor: (theme ? theme.primary + '15' : '#F3F4F6'), color: (theme ? theme.primary : '#1F2937') }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={i} style={[styles.italic, { color }]}>
          {part.slice(1, -1)}
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
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 4,
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
