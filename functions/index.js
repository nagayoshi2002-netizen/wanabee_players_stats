/* functions/index.js（全文置換）
 * matches/{matchId} 作成時に:
 * - tournaments/{tournamentId}/teams/{teamUid}/players を読み
 * - matches/{matchId}/teams/{teamUid}/players に set(merge) で自動コピー
 * - playersSynced / syncPlayersStatus を更新
 */

const admin = require("firebase-admin");
admin.initializeApp();

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");

const db = admin.firestore();

// 1 batch <= 500。余裕を見て 450 にする
const BATCH_LIMIT = 450;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function copyPlayersForTeam({ matchId, tournamentId, teamUid }) {
  // source: tournaments/{tournamentId}/teams/{teamUid}/players/{playerId}
  const srcCol = db
    .collection("tournaments")
    .doc(tournamentId)
    .collection("teams")
    .doc(teamUid)
    .collection("players");

  const snap = await srcCol.get();
  if (snap.empty) {
    return { teamUid, copied: 0 };
  }

  const players = snap.docs.map((d) => {
    const data = d.data() || {};
    const id = d.id; // 背番号docId運用想定
    const number = String(data.number || id).trim();
    const name = String(data.name || "").trim();

    return {
      id,
      number,
      name,
      active: data.active === false ? false : true,
    };
  });

  // dest: matches/{matchId}/teams/{teamUid}/players/{playerId}
  const destBase = db
    .collection("matches")
    .doc(matchId)
    .collection("teams")
    .doc(teamUid)
    .collection("players");

  let copied = 0;

  // set(merge) を大量に投げるので分割バッチ
  const chunks = chunkArray(players, BATCH_LIMIT);

  for (const ch of chunks) {
    const batch = db.batch();
    for (const p of ch) {
      if (!p.number) continue;

      const destRef = destBase.doc(p.number); // docId=背番号
      batch.set(
        destRef,
        {
          number: p.number,
          name: p.name,
          active: p.active === false ? false : true,
          fromTournament: tournamentId,
          syncedBy: "functions",
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          sourcePlayerId: p.id,
        },
        { merge: true }
      );
      copied++;
    }
    await batch.commit();
  }

  return { teamUid, copied };
}

exports.syncTournamentPlayersToNewMatch = onDocumentCreated(
  {
    document: "matches/{matchId}",
    region: "asia-northeast1",
    // 既定のタイムアウトで足りない場合に調整（必要なら）
    // timeoutSeconds: 60,
    // memory: "256MiB",
  },
  async (event) => {
    const matchId = event.params.matchId;
    const snap = event.data;
    if (!snap) return;

    const match = snap.data() || {};

    const tournamentId = String(match.tournamentId || "").trim();
    const teamAUid = String(match.teamAUid || "").trim();
    const teamBUid = String(match.teamBUid || "").trim();

    const matchRef = db.collection("matches").doc(matchId);

    // 必須フィールドがないなら失敗として記録して終了
    if (!tournamentId || !teamAUid || !teamBUid) {
      logger.warn("sync aborted: missing fields", {
        matchId,
        tournamentId,
        teamAUid,
        teamBUid,
      });

      await matchRef.set(
        {
          playersSynced: false,
          syncPlayersStatus: "error",
          syncPlayersError: "missing tournamentId/teamAUid/teamBUid",
          syncPlayersUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    // 冪等ガード（既に done なら何もしない）
    const latest = await matchRef.get();
    const latestData = latest.exists ? latest.data() : {};
    if (latestData && latestData.syncPlayersStatus === "done") {
      logger.info("sync skipped: already done", { matchId });
      return;
    }

    // pending にする
    await matchRef.set(
      {
        playersSynced: false,
        syncPlayersStatus: "pending",
        syncPlayersError: admin.firestore.FieldValue.delete(),
        syncPlayersUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    try {
      // A/B それぞれコピー（大会マスタが空でもOK）
      const [resA, resB] = await Promise.all([
        copyPlayersForTeam({ matchId, tournamentId, teamUid: teamAUid }),
        copyPlayersForTeam({ matchId, tournamentId, teamUid: teamBUid }),
      ]);

      await matchRef.set(
        {
          playersSynced: true,
          syncPlayersStatus: "done",
          syncPlayersDoneAt: admin.firestore.FieldValue.serverTimestamp(),
          syncPlayersUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncPlayersCopied: {
            [resA.teamUid]: resA.copied,
            [resB.teamUid]: resB.copied,
          },
        },
        { merge: true }
      );

      logger.info("sync done", { matchId, tournamentId, resA, resB });
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      logger.error("sync failed", { matchId, tournamentId, error: msg });

      await matchRef.set(
        {
          playersSynced: false,
          syncPlayersStatus: "error",
          syncPlayersError: msg,
          syncPlayersUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
);
