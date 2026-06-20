# Stats Card Test

URL만 단독으로 쓰면 이미지가 아니라 일반 링크로 보일 수 있습니다.
아래처럼 Markdown 이미지 문법이나 HTML `img` 태그로 넣어야 카드가 표시됩니다.

## Markdown Example

![GitHub Stats](http://localhost:3005/api/github-stats?username=hun9008&theme=terminal)

## HTML Example

<img
  src="http://localhost:3005/api/github-stats?username=hun9008&theme=terminal"
  alt="hun9008 GitHub Stats Card"
/>

## Theme Examples

![Terminal Theme](http://localhost:3005/api/github-stats?username=hun9008&theme=terminal)

![Dark Theme](http://localhost:3005/api/github-stats?username=hun9008&theme=dark)

![Light Theme](http://localhost:3005/api/github-stats?username=hun9008&theme=light)
