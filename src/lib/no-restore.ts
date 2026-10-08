/**
 * disabled が変わるボタンに付ける。Firefox は読み込み直しや戻るで開いたとき、ボタンの disabled を
 * 前の表示の状態に戻すので、サーバーの HTML と食い違い、React がハイドレーションの不一致を出す。
 * autocomplete="off" で戻させない。React の型ではボタンに autoComplete が無いので、広げて渡す
 */
export const NO_RESTORE = { autoComplete: 'off' } as object;
