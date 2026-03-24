/**
 * jpnkn → わんコメ 変換ロジックのユニットテスト (新形式専用)
 * 
 * 本テストは docs/jpnkn-api-spec.md の新形式（body フィールド）を
 * 「正解」として、変換ロジックが仕様に準拠していることを検証します。
 */

import { transformJpnknToOneComme, parsePayload } from '../src/transform.js';
import type { JpnknPayload, TransformOptions } from '../src/transform.js';

describe('transformJpnknToOneComme - 新形式', () => {
  const defaultOptions: TransformOptions = { serviceId: 'test-service-id' };

  describe('基本的なマッピング', () => {
    test('bodyフィールドのmailがわんコメのuserIdにマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: 'テスト太郎<>test@example.com<>2026/02/03(火) 12:00:00<>これはテストメッセージです<>',
        no: '100',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.userId).toBe('test@example.com');
    });

    test('bodyフィールドの本文がわんコメのcommentにマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: 'テスト太郎<>sage<>2026/02/03(火) 12:00:00<>これはテストメッセージです<>',
        no: '100',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe('これはテストメッセージです');
    });

    test('bodyフィールドの名前がわんコメのnameにマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: 'テスト太郎<>sage<>2026/02/03(火) 12:00:00<>テストメッセージ<>',
        no: '1',
        bbsid: 'test',
        threadkey: '999'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.name).toBe('テスト太郎');
    });
  });

  describe('mailフィールドのマッピング', () => {
    test('mailが空の場合はデフォルト値が使用される', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.userId).toBe('jpnkn:anonymous');
    });

    test('sage が正しくマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<>sage<>2026/02/03(火) 12:00:00<>テスト<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.userId).toBe('sage');
    });
  });

  describe('HTMLエスケープのアンエスケープ', () => {
    test('本文の &lt; &gt; &amp; がアンエスケープされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>a &lt; b &gt; c &amp; d<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe('a < b > c & d');
    });

    test('名前の &lt; &gt; &amp; がアンエスケープされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: 'A&amp;B<><>2026/02/03(火) 12:00:00<>テスト<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.name).toBe('A&B');
    });
  });

  describe('メッセージ本文のマッピング', () => {
    test('通常のテキストメッセージが正しくマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>通常のテキスト<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe('通常のテキスト');
    });

    test('マルチバイト文字（日本語）が正しくマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>これは日本語のテストです 🎉<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe('これは日本語のテストです 🎉');
    });

    test('改行を含むメッセージが正しくマッピングされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>1行目\n2行目\n3行目<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe('1行目\n2行目\n3行目');
    });

    test('長いメッセージが正しくマッピングされる', () => {
      const longMessage = 'あ'.repeat(500);
      const jpnknPayload: JpnknPayload = {
        body: `名無し<><>2026/02/03(火) 12:00:00<>${longMessage}<>`,
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe(longMessage);
      expect(result.comment.comment.length).toBe(500);
    });
  });

  describe('service.idの生成', () => {
    test('指定されたserviceIdがservice.idにセットされる', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, { serviceId: 'my-custom-service-id' });

      expect(result.service.id).toBe('my-custom-service-id');
    });
  });

  describe('comment.idの生成', () => {
    test('bbsid, threadkey, noが揃っている場合は一意のIDが生成される', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
        no: '100',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.id).toBe('jpnkn:news:12345:100');
    });

    test('noが0の場合も正しくIDが生成される', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
        no: '0',
        bbsid: 'news',
        threadkey: '12345'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.id).toBe('jpnkn:news:12345:0');
    });
  });

  describe('エラーハンドリング', () => {
    test('serviceIdが未指定の場合はエラーをスローする', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      expect(() => transformJpnknToOneComme(jpnknPayload, {} as TransformOptions)).toThrow('serviceId is required');
    });

    test('本文が空の場合はエラーをスローする', () => {
      const jpnknPayload: JpnknPayload = {
        body: '名無し<><>2026/02/03(火) 12:00:00<><>',
        no: '1',
        bbsid: 'news',
        threadkey: '12345'
      };

      expect(() => transformJpnknToOneComme(jpnknPayload, defaultOptions)).toThrow('message is required');
    });

    test('nullペイロードの場合はエラーをスローする', () => {
      expect(() => transformJpnknToOneComme(null as any, defaultOptions)).toThrow('Invalid jpnkn payload');
    });

    test('undefinedペイロードの場合はエラーをスローする', () => {
      expect(() => transformJpnknToOneComme(undefined as any, defaultOptions)).toThrow('Invalid jpnkn payload');
    });
  });

  describe('出力形式の検証', () => {
    test('出力がわんコメAPIスキーマに準拠している', () => {
      const jpnknPayload: JpnknPayload = {
        body: 'テスト太郎<>test@example.com<>2026/02/03(火) 12:00:00<>これはテストです<>',
        no: '123',
        bbsid: 'news',
        threadkey: '99999'
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('service.id');
      expect(result).toHaveProperty('comment');
      expect(result).toHaveProperty('comment.id');
      expect(result).toHaveProperty('comment.userId');
      expect(result).toHaveProperty('comment.name');
      expect(result).toHaveProperty('comment.comment');
    });
  });
});

describe('parsePayload - 新形式', () => {
  test('新形式のJSONペイロードが正しくパースされる', () => {
    const payload = {
      body: '名無しさん<>sage<>2026/02/03(火) 12:00:00<>テストです<>',
      no: '123',
      bbsid: 'news',
      threadkey: '12345'
    };
    const raw = JSON.stringify(payload);

    const result = parsePayload(raw);

    expect(result).toBe('No.123 名無しさん > テストです');
  });

  test('noがない場合はNo.を省略する', () => {
    const payload = {
      body: '名無しさん<>sage<>2026/02/03(火) 12:00:00<>テストです<>',
      bbsid: 'news',
      threadkey: '12345'
    };
    const raw = JSON.stringify(payload);

    const result = parsePayload(raw);

    expect(result).toBe('名無しさん > テストです');
  });

  test('名前が空の場合は名前部分を省略する', () => {
    const payload = {
      body: '<>sage<>2026/02/03(火) 12:00:00<>テストです<>',
      no: '123',
      bbsid: 'news',
      threadkey: '12345'
    };
    const raw = JSON.stringify(payload);

    const result = parsePayload(raw);

    expect(result).toBe('No.123 テストです');
  });

  test('無効なJSONの場合は元のテキストを返す', () => {
    const invalidJson = 'これはJSONではありません';

    const result = parsePayload(invalidJson);

    expect(result).toBe(invalidJson);
  });
});

describe('新形式の必須フィールド検証', () => {
  const defaultOptions: TransformOptions = { serviceId: 'test-service-id' };

  test('必須フィールド（body, no, bbsid, threadkey）がすべて揃ったペイロードを正しく処理', () => {
    const completePayload: JpnknPayload = {
      body: '名無し<>sage<>2026/02/03(火) 12:00:00<>テストメッセージ<>',
      no: '100',
      bbsid: 'news',
      threadkey: '1234567890'
    };

    const result = transformJpnknToOneComme(completePayload, defaultOptions);

    expect(result.comment.comment).toBe('テストメッセージ');
    expect(result.comment.name).toBe('名無し');
    expect(result.comment.id).toBe('jpnkn:news:1234567890:100');
  });

  test('出力にservice.idが含まれる', () => {
    const jpnknPayload: JpnknPayload = {
      body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
      no: '1',
      bbsid: 'news',
      threadkey: '12345'
    };

    const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

    expect(result.service.id).toBe('test-service-id');
  });

  test('出力にcomment必須フィールドがすべて含まれる', () => {
    const jpnknPayload: JpnknPayload = {
      body: '名無し<><>2026/02/03(火) 12:00:00<>テスト<>',
      no: '1',
      bbsid: 'news',
      threadkey: '12345'
    };

    const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

    expect(result.comment).toHaveProperty('id');
    expect(result.comment).toHaveProperty('userId');
    expect(result.comment).toHaveProperty('name');
    expect(result.comment).toHaveProperty('comment');
  });
});
