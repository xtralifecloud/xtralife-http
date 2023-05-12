module.exports = {
	"com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3": {
		'before-gamervfs-write': function (params, customData, mod) {
			return 'before';
		},
		'after-gamervfs-write': function (params, customData, mod) {
			if (customData != 'before') {
				throw new Error('Hook context lost');
			}
			return this.virtualfs.read('com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3', params.user_id, null)
				.then(function (allkeys) {
					return 'DONE!';
				});
		}
	},

	"com.clanofthecloud.cloudbuilder.azerty": {
		'social-addprofile': function (params, customData, mod) {
			return this.virtualfs.readmulti(params.domain, params.userids, ['key1', 'key2'], ['properties', 'balance']);
		},
		'before-transaction': function (params, customData, mod) {
			//console.log('[Hook] Before transaction');
			mod.debug('logged from before-transaction');
		},
		'after-transaction': function (params, customData, mod) {
			//console.log('[Hook] After transaction');
			mod.debug('logged from after-transaction');
		},
		'before-balance': function (params, customData, mod) {
			//console.log('[Hook] Before Balance');
		},
		'before-gamervfs-read': function (params, customData, mod) {
			//console.log('[Hook] should print {hello:' + new Date() + '} in 1 second');
		},
		'after-properties-write': function (params, customData, mod) {
			return params.key == 'echo' ? null : this.user.properties.write(params.domain, params.user_id, 'echo', (params.key != null) ? params.value : 'object');
		},
		'after-achievement-triggered': function (params, customData, mod) {
			//console.log('[Hook] After achievement triggered');
			this.achievement.modifyUserAchievementData(params.domain, params.user_id, 'testOnce', { 'fromHook': 'value' });
		},
		'after-achievement-userdata-modified': function (params, customData, mod) {
			//console.log('[Hook] After achievement userdata triggered');
			this.achievement.getUserAchievements(params.domain, params.user_id);// .then(console.log);
		},
		'before-match-create': function (params, customData, mod) {
			//console.log('[Hook] Before match created', params.match.description);
		},
		'after-match-create': function (params, customData, mod) {
			//console.log('[Hook] After match created', params.match.description);
		},
		'before-match-delete': function (params, customData, mod) {
			//console.log('[Hook] Before match deleted', params.match.description);
		},
		'after-match-delete': function (params, customData, mod) {
			//console.log('[Hook] After match deleted', params.match.description);
		},
		'after-match-dismissinvitation': function (params, customData, mod) {
			//console.log('[Hook] Dismissed invitation', params.user_id, params.match.description);
		},
		'before-match-drawfromshoe': function (params, customData, mod) {
			//console.log('[Hook] Before draw from shoe', params.drawnItems);
		},
		'after-match-drawfromshoe': function (params, customData, mod) {
			//console.log('[Hook] After draw from shoe', params.drawnItems);
		},
		'before-match-finish': function (params, customData, mod) {
			//console.log('[Hook] Before match finish', params.match.description);
		},
		'after-match-finish': function (params, customData, mod) {
			//console.log('[Hook] After match finish', params.match.description);
		},
		'before-match-invite': function (params, customData, mod) {
			//console.log('[Hook] Before match invite', params.invitee_id, params.match.description);
		},
		'after-match-invite': function (params, customData, mod) {
			//console.log('[Hook] After match invite', params.invitee_id, params.match.description);
		},
		'before-match-join': function (params, customData, mod) {
			//console.log('[Hook] Before match join', params.user_id, params.match.description);
		},
		'after-match-join': function (params, customData, mod) {
			//console.log('[Hook] After match join', params.user_id, params.match.description);
		},
		'before-match-leave': function (params, customData, mod) {
			//console.log('[Hook] Before match leave', params.user_id, params.match.description);
		},
		'after-match-leave': function (params, customData, mod) {
			//console.log('[Hook] After match leave', params.user_id, params.match.description);
		},
		'before-match-join': function (params, customData, mod) {
			//console.log('[Hook] Before match join', params.user_id, params.match.description);
		},
		'before-match-postmove': function (params, customData, mod) {
			//console.log('[Hook] Before match post move', params.move, params.match.description);
		},
		'after-match-postmove': function (params, customData, mod) {
			//console.log('[Hook] After match post move', params.move, params.match.description);
		},
		'__console': function (params, customData, mod) {
			//console.log(params);
			//console.log('received at ' + new Date());
		},
		'__test1': function (params, customData, mod) {
			return { input: params.request.input, domain: this.game.getPrivateDomain() };
		},
		'__test2': function (params, customData, mod) {
			return { userFound: params.user_id };
		},
		'__test3': function (params, customData, mod) {
			var domain = this.game.getPrivateDomain();
			return mod.Q.all(
				[this.virtualfs.read(domain, params.user_id, null),
				this.tx.balance(domain, params.user_id)]
			).then((result) => {
				const [fs, balance] = result;
				return { fs: fs, balance: balance };
			});
		},
		'__test4': function (params, customData, mod) {
			return mod.Q.all([ // TODO why Q.all here ?
				this.user.account.convert(params.user_id, "email", "test" + Math.random() + "@localhost.localdomain", "pass*123", { updatedGamer: true })
					.then(function (result) {
						return { got: result };
					})
			]);
		},
		'__test5': function (params, customData, mod) {
			return mod.Q.all([ // TODO why Q.all here ?
				this.user.account.convert(params.user_id, "facebook", "CAAOubWEN7ZBIBALPkqZAj4XoZBS90OErzJ7TGr8mp3ffrpRS81TZBFrkoiAZAC8GuXaW3lVozoTyT7ZAineSS80DAbblGEybRFwKJGlBo4H5ux5hQcBMvSy2h9rIcJkAEslUXDZApVjeLdNZB7Xct1N7PyqWmS4jAypvLfe0U8brS9X0L3DfuZBamSlNlnIZAGaUedIwYTTRT95gZDZD", null, { updatedGamer: true })
					.then(function (result) {
						return { got: result };
					}).catch(function (err) {
						return { error: err };
					})
			]);
		},
		'__hasIsSafe': function (params, customData, mod) {
			return { isSafe: mod.isSafe() };
		},
		'__callsHasIsSafe': function (params, customData, mod) {
			return this.game.runBatch('com.clanofthecloud.cloudbuilder.azerty', 'hasIsSafe', {})
		},
		'__login': function (params, customData, mod) {
			var contest = 'Silver';
			return this.virtualfs.readmulti('com.clanofthecloud.cloudbuilder.azerty', [params.user_id], [], ['properties.echo', 'balance.Gold', 'balance.' + contest]);
		},
		common: function (mod) {
			return {
				itworks2: function () {
					return mod.Q.resolve('itworks');
				},
				itworks: function () {
					return 'itworks';
				}
			};
		},
		'__usecommon': function (params, customData, mod) {
			return mod.common.itworks();
		},
		'__usecommon2': function (params, customData, mod) {
			return mod.common.itworks2();
		},
		'__bestscoresInBatch': function (params, customData, mod) {
			return this.leaderboard.bestscores(this.game.getPrivateDomain(), params.user_id);
		},
		'__sendEventTest': function (params, customData, mod) {
			return this.game.sendEvent(this.game.getPrivateDomain(), params.user_id, { hello: 'world' });
		},
		'__highscoreInBatch': function (params, customData, mod) {
			return this.leaderboard.highscore(this.game.getPrivateDomain(), null, 'easyboard', 10);
		},
		'__centeredScoreInBatch': function (params, customData, mod) {
			return this.leaderboard.highscore(this.game.getPrivateDomain(), params.user_id, 'easyboard', 10);
		},
		'__auth_customNetwork_comclanofthecloudcloudbuilder': function (params, customData, mod) {
			var { user_id, user_token } = params;
			return { verified: user_token == user_id }
		},
	}
};

