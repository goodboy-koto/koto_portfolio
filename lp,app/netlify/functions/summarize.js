// GoogleのAIライブラリをインポート
const { GoogleGenerativeAI } = require("@google/generative-ai");

// APIキーの読み込み
const API_KEY = process.env.GOOGLE_AI_API_KEY || "ここにあなたのAPIキーを貼り付け"; 

// AIクライアントを初期化
const genAI = new GoogleGenerativeAI(API_KEY);

// Netlifyのサーバーレス関数のメイン処理
exports.handler = async function(event, context) {
    try {
        const { textToSummarize } = JSON.parse(event.body);
        if (!textToSummarize) {
            throw new Error("要約するテキストがありません。");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `以下の文章を、自己分析の文脈で簡潔に要約してください。重要なキーワードや感情、思考のパターンが分かるようにまとめてください。\n\n---\n${textToSummarize}`;

        // ★ 修正点: 日本語エラーを回避するためのオプションを追加
        const result = await model.generateContent(prompt, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        // ★ ここまで

        const response = await result.response;
        const summary = await response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ summary: summary })
        };

    } catch (error) {
        console.error("AI要約エラー:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AIの要約中にエラーが発生しました。" })
        };
    }
};