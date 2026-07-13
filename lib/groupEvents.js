/**
 * Group Events Handler
 * Jere evènman grup yo (nouvo manm, retire, etc)
 */

const { handleNewGroupParticipants } = require('./welcomeMessage');

/**
 * Setup grup event listener
 * @param {object} sock - WhatsApp socket
 */
function setupGroupEvents(sock) {
    // Detekte schanjman grup (nouvo manm, retire, etc)
    sock.ev.on('groups.update', async (update) => {
        try {
            for (const change of update) {
                const groupJid = change.id;
                
                // Nouvo manm
                if (change.participants) {
                    const { added, removed } = change.participants;
                    
                    if (added && added.length > 0) {
                        console.log(`\n🎉 ${added.length} nouvo manm nan grup ${groupJid}`);
                        await handleNewGroupParticipants(sock, groupJid, added);
                    }
                    
                    if (removed && removed.length > 0) {
                        console.log(`\n👋 ${removed.length} manm soti nan grup ${groupJid}`);
                    }
                }
                
                // Schanj non grup
                if (change.subject) {
                    console.log(`📝 Grup rename: ${change.subject}`);
                }
                
                // Schanj deskripsyon
                if (change.desc) {
                    console.log(`📝 Deskripsyon chanje`);
                }
            }
        } catch (error) {
            console.error('❌ Erè nan group update:', error);
        }
    });
}

module.exports = {
    setupGroupEvents
};
