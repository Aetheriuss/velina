import NextLink from 'next/link';

// Next 13+ made <Link> render its own <a>; every caller of this wrapper passes an <a> child
// (the Next 12 pattern), so use legacyBehavior + passHref to keep that working app-wide from
// this single place rather than rewriting ~40 call sites.
const Link = props => {
  return <NextLink href={props.href} legacyBehavior passHref>
    {props.children}
  </NextLink>
}

export default Link;