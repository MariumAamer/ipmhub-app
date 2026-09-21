/* eslint-disable prettier/prettier */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Linking,
  Platform,
  Clipboard,
} from 'react-native';
import Svg, {Path, Rect, G, Defs, ClipPath} from 'react-native-svg';

// ─── Platform icons — exact SVGs from Figma ──────────────────────────────────
const FacebookIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M20 10.0251C20 4.49123 15.52 0 10 0C4.48 0 0 4.49123 0 10.0251C0 14.8772 3.44 18.9173 8 19.8496V13.0326H6V10.0251H8V7.5188C8 5.58396 9.57 4.01003 11.5 4.01003H14V7.01754H12C11.45 7.01754 11 7.46867 11 8.02005V10.0251H14V13.0326H11V20C16.05 19.4987 20 15.2281 20 10.0251Z" fill="#192546" />
  </Svg>
);

const LinkedInIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0ZM5.13672 8.25277V15H7.45931V8.25277H5.13672ZM13.16 8.09489C11.9276 8.09489 11.3754 8.74924 11.0669 9.20898V8.25277H8.7443C8.77478 8.88587 8.7443 15 8.7443 15H11.0669V11.2321C11.0669 11.0306 11.0821 10.8293 11.1434 10.6852C11.3113 10.2823 11.6933 9.86491 12.3348 9.86491C13.1751 9.86494 13.5116 10.4838 13.5116 11.3908V15H15.8333V11.1312C15.8333 9.05895 14.6877 8.09498 13.16 8.09489ZM6.31348 5C5.51947 5.00014 5.0002 5.50361 5 6.16536C5 6.81283 5.50404 7.33154 6.28337 7.33154H6.29883C7.1084 7.33137 7.6123 6.8127 7.6123 6.16536C7.59704 5.50351 7.10779 5 6.31348 5Z" fill="#0C4D91" />
  </Svg>
);

const XIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5.71387 5.13232L13.1105 14.8032H14.2439L6.93137 5.13232H5.71387Z" fill="#192546" />
    <Path d="M10 0C4.4775 0 0 4.4775 0 10C0 15.5225 4.4775 20 10 20C15.5225 20 20 15.5225 20 10C20 4.4775 15.5225 0 10 0ZM12.5525 16.0267L9.3275 11.8142L5.6425 16.0267H3.59417L8.37167 10.565L3.33333 3.97333H7.55167L10.4633 7.82417L13.8325 3.97333H15.8783L11.4108 9.07833L16.6667 16.0258L12.5525 16.0267Z" fill="#192546" />
  </Svg>
);

const YouTubeIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Defs>
      <ClipPath id="youtubeClip">
        <Rect width="19.9975" height="19.9975" fill="white" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#youtubeClip)">
      <Path fillRule="evenodd" clipRule="evenodd" d="M9.99917 0C4.47667 0 0 4.4775 0 9.99917C0 15.5208 4.47667 19.9975 9.99917 19.9975C15.5217 19.9975 19.9975 15.5208 19.9975 9.99917C19.9975 4.4775 15.5208 0 9.99917 0ZM16.0133 12.585C16.0133 13.4375 15.3408 14.1283 14.4992 14.1692L14.49 14.1775C14.49 14.1775 13.9108 14.3725 10.5458 14.3725C7.18083 14.3725 5.39 14.1775 5.39 14.1775L5.37167 14.16C4.68667 14.0883 4.13 13.5883 3.98417 12.9275C3.98167 12.9142 3.97833 12.9017 3.97583 12.8883C3.93583 12.7025 3.75 11.7217 3.75 9.88167C3.75 8.41083 3.88917 7.55417 3.96833 7.18083C4.07167 6.47667 4.63083 5.92833 5.33917 5.84C5.67833 5.78417 6.91917 5.625 9.99917 5.625C13.28 5.625 14.475 5.80583 14.715 5.85C15.4183 5.98083 15.9525 6.575 16.0033 7.30417C16.1483 8.13833 16.4458 10.3517 16.0133 12.585ZM8.74917 11.8742L12.0308 9.99917L8.74917 8.12417V11.8742Z" fill="#192546" />
    </G>
  </Svg>
);

const WhatsAppIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 0C15.523 0 20 4.477 20 9.99999C20 15.523 15.523 20 10 20C8.23276 20.003 6.49659 19.5353 4.97001 18.645L0.00401545 20L1.35601 15.032C0.464974 13.5049 -0.00308162 11.768 1.52687e-05 9.99999C1.52687e-05 4.477 4.47701 0 10 0ZM6.59201 5.3L6.39201 5.308C6.2627 5.31691 6.13636 5.35087 6.02001 5.408C5.91159 5.46951 5.81257 5.54629 5.72601 5.636C5.60601 5.749 5.53801 5.847 5.46501 5.942C5.09513 6.4229 4.89598 7.01331 4.89901 7.61999C4.90101 8.10999 5.02901 8.58699 5.22901 9.03299C5.63801 9.93499 6.31101 10.89 7.19901 11.775C7.41301 11.988 7.62301 12.202 7.84901 12.401C8.95244 13.3724 10.2673 14.073 11.689 14.447L12.257 14.534C12.442 14.544 12.627 14.53 12.813 14.521C13.1042 14.5056 13.3885 14.4268 13.646 14.29C13.7769 14.2223 13.9046 14.1489 14.029 14.07C14.029 14.07 14.0713 14.0413 14.154 13.98C14.289 13.88 14.372 13.809 14.484 13.692C14.568 13.6053 14.638 13.5047 14.694 13.39C14.772 13.227 14.85 12.916 14.882 12.657C14.906 12.459 14.899 12.351 14.896 12.284C14.892 12.177 14.803 12.066 14.706 12.019L14.124 11.758C14.124 11.758 13.254 11.379 12.722 11.137C12.6663 11.1127 12.6067 11.0989 12.546 11.096C12.4776 11.0888 12.4084 11.0965 12.3432 11.1184C12.278 11.1403 12.2182 11.176 12.168 11.223C12.163 11.221 12.096 11.278 11.373 12.154C11.3315 12.2098 11.2743 12.2519 11.2088 12.275C11.1433 12.2982 11.0723 12.3013 11.005 12.284C10.9398 12.2666 10.876 12.2446 10.814 12.218C10.69 12.166 10.647 12.146 10.562 12.11C9.98788 11.8599 9.45645 11.5215 8.98701 11.107C8.86101 10.997 8.74401 10.877 8.62401 10.761C8.23062 10.3842 7.88776 9.95798 7.60401 9.49299L7.54501 9.39799C7.50327 9.33379 7.46905 9.26501 7.44301 9.19299C7.40501 9.04599 7.50401 8.92799 7.50401 8.92799C7.50401 8.92799 7.74701 8.66199 7.86001 8.51799C7.97001 8.37799 8.06301 8.24199 8.12301 8.14499C8.24101 7.95499 8.27801 7.75999 8.21601 7.60899C7.93601 6.92499 7.64668 6.24466 7.34801 5.568C7.28901 5.434 7.11401 5.338 6.95501 5.319C6.90101 5.31233 6.84701 5.307 6.79301 5.303C6.65874 5.29529 6.5241 5.29663 6.39001 5.307L6.59201 5.3Z" fill="#192546" />
  </Svg>
);

const EmailIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Defs>
      <ClipPath id="emailClip">
        <Rect width="20" height="20" fill="white" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#emailClip)">
      <Path d="M10 0C15.5229 0 20 4.47765 20 10.0003C20 15.523 15.5229 20 10 20C4.47712 20 0 15.523 0 10.0003C0 4.47765 4.47712 0 10 0ZM12.267 10.6205L10.0042 12.5484L7.74606 10.6205L4.1725 13.8335H15.8331L12.267 10.6205ZM15.8348 7.41669L12.9091 10.0429L15.8348 12.6668V7.41669ZM4.16667 7.41669V12.6668L7.09651 10.0429L4.16667 7.41669ZM15.8331 6.25H4.1725L10.0042 11.4915L15.8331 6.25Z" fill="#192546" />
    </G>
  </Svg>
);

const CopyLinkIcon = () => (
  <Svg width={19} height={19} viewBox="0 0 19 19" fill="none">
    <Path d="M7.81967 6.2514C8.60716 6.252 9.4663 6.51228 10.0778 7.12472C10.425 7.47274 10.4246 8.03628 10.0768 8.38375C9.72874 8.73129 9.1646 8.73086 8.81705 8.38278C8.61487 8.18035 8.25218 8.03298 7.8183 8.03265C7.38463 8.03235 7.02225 8.17925 6.81974 8.38124L2.74507 12.4496C2.54259 12.6518 2.39454 13.0144 2.3942 13.4484C2.39389 13.8823 2.54138 14.2452 2.74353 14.4477L3.55663 15.262C3.75878 15.4645 4.12148 15.6125 4.55538 15.6129C4.98932 15.6132 5.35219 15.4657 5.55467 15.2636L7.1841 13.6367C7.53218 13.2891 8.09632 13.2895 8.44386 13.6376C8.79131 13.9857 8.79081 14.5491 8.44289 14.8967L6.81347 16.5243C6.20103 17.1358 5.34149 17.3948 4.55401 17.3941C3.76659 17.3935 2.90808 17.1332 2.29662 16.5208L1.4828 15.7057C0.871392 15.0933 0.612371 14.2344 0.612955 13.447C0.613561 12.6595 0.873843 11.8004 1.48628 11.1889L5.56095 7.12124C6.17334 6.50979 7.03223 6.25083 7.81967 6.2514ZM12.7094 1.36918C13.4968 1.36981 14.3553 1.63015 14.9668 2.2425L15.7806 3.05758C16.392 3.66998 16.6511 4.52889 16.6505 5.31631C16.6499 6.10379 16.3896 6.96293 15.7772 7.57442L11.7025 11.6421C11.0901 12.2535 10.2312 12.5125 9.44376 12.5119C8.65627 12.5113 7.79713 12.251 7.18564 11.6386C6.83846 11.2906 6.83888 10.727 7.18661 10.3796C7.53469 10.032 8.09883 10.0325 8.44637 10.3805C8.64856 10.583 9.01124 10.7303 9.44513 10.7307C9.8788 10.731 10.2412 10.5841 10.4437 10.3821L14.5184 6.31369C14.7208 6.11152 14.8689 5.74888 14.8692 5.31493C14.8695 4.88104 14.722 4.5181 14.5199 4.31564L13.7068 3.50129C13.5047 3.29883 13.1419 3.15078 12.7081 3.15043C12.2741 3.15009 11.9112 3.29759 11.7088 3.49975L10.0793 5.12667C9.73125 5.47422 9.16711 5.47378 8.81956 5.1257C8.47212 4.77767 8.47262 4.21421 8.82053 3.86667L10.45 2.23902C11.0624 1.62753 11.9219 1.36857 12.7094 1.36918Z" fill="#192647" />
  </Svg>
);

const ShareIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Rect width="15" height="15" rx="7.5" fill="white" />
    <Path d="M9.20019 11.4002C8.92242 11.4002 8.68631 11.2952 8.49186 11.0852C8.29742 10.8752 8.2002 10.6202 8.2002 10.3202C8.2002 10.2842 8.20853 10.2002 8.22519 10.0682L5.88353 8.5922C5.79464 8.6822 5.69186 8.75276 5.5752 8.80388C5.45853 8.855 5.33353 8.88044 5.2002 8.8802C4.92242 8.8802 4.68631 8.7752 4.49186 8.5652C4.29742 8.3552 4.2002 8.1002 4.2002 7.8002C4.2002 7.5002 4.29742 7.2452 4.49186 7.0352C4.68631 6.8252 4.92242 6.7202 5.2002 6.7202C5.33353 6.7202 5.45853 6.74576 5.5752 6.79688C5.69186 6.848 5.79464 6.91844 5.88353 7.0082L8.22519 5.5322C8.21408 5.4902 8.20719 5.44976 8.20453 5.41088C8.20186 5.372 8.20042 5.32844 8.2002 5.2802C8.2002 4.9802 8.29742 4.7252 8.49186 4.5152C8.68631 4.3052 8.92242 4.2002 9.20019 4.2002C9.47797 4.2002 9.71408 4.3052 9.90853 4.5152C10.103 4.7252 10.2002 4.9802 10.2002 5.2802C10.2002 5.5802 10.103 5.8352 9.90853 6.0452C9.71408 6.2552 9.47797 6.3602 9.20019 6.3602C9.06686 6.3602 8.94186 6.33464 8.82519 6.28352C8.70853 6.2324 8.60575 6.16196 8.51686 6.0722L6.1752 7.5482C6.18631 7.5902 6.19331 7.63076 6.1962 7.66988C6.19908 7.709 6.20042 7.75244 6.2002 7.8002C6.19997 7.84796 6.19864 7.89152 6.1962 7.93088C6.19375 7.97024 6.18675 8.01068 6.1752 8.0522L8.51686 9.5282C8.60575 9.4382 8.70853 9.36776 8.82519 9.31688C8.94186 9.266 9.06686 9.24044 9.20019 9.2402C9.47797 9.2402 9.71408 9.3452 9.90853 9.5552C10.103 9.7652 10.2002 10.0202 10.2002 10.3202C10.2002 10.6202 10.103 10.8752 9.90853 11.0852C9.71408 11.2952 9.47797 11.4002 9.20019 11.4002Z" fill="#0C4D91" />
  </Svg>
);

// Close (X) icon — exact from Figma, 20x20, mask-based, #C5C6CC fill.
// Same icon used across every sheet in Resources (Filter by Category, Share,
// Table of Contents) so it doesn't drift out of position/size per screen.
const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.61612 1.61611C2.10427 1.12796 2.89573 1.12796 3.38388 1.61611L18.3839 16.6159C18.872 17.104 18.872 17.8955 18.3839 18.3836C17.8957 18.8718 17.1043 18.8718 16.6161 18.3836L1.61612 3.38385C1.12796 2.8957 1.12796 2.10426 1.61612 1.61611Z" fill="#C5C6CC" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M18.3839 1.61611C17.8957 1.12796 17.1043 1.12796 16.6161 1.61611L1.61612 16.6159C1.12796 17.104 1.12796 17.8955 1.61612 18.3836C2.10427 18.8718 2.89573 18.8718 3.38388 18.3836L18.3839 3.38385C18.872 2.8957 18.872 2.10426 18.3839 1.61611Z" fill="#C5C6CC" />
  </Svg>
);

// Submit-resource icon — small upload arrow (re-used inline in copy button)
const UploadArrowIcon = () => (
  <Svg width={11} height={12} viewBox="0 0 11 12" fill="none">
    <Path d="M3.2929 3.19895L4.64534 1.86089L4.65556 8.41749C4.65556 8.81593 4.98216 9.13894 5.38503 9.13894C5.78791 9.13894 6.11451 8.81593 6.11451 8.41749L6.10429 1.86908L7.44897 3.19897C7.72886 3.48557 8.19066 3.4935 8.48044 3.21669C8.77023 2.93987 8.77825 2.48315 8.49836 2.19655C8.49248 2.19053 8.48651 2.18462 8.48044 2.17883L6.91839 0.633943C6.06376 -0.211311 4.67813 -0.211311 3.82348 0.63392L3.82345 0.633943L2.26142 2.17881C1.98153 2.4654 1.98955 2.92213 2.27934 3.19895C2.56203 3.46897 3.0102 3.46897 3.2929 3.19895Z" fill="#192546" />
    <Path d="M10.1256 7.16943C9.75274 7.16943 9.45052 7.4631 9.45052 7.82534V9.83285C9.45026 9.93152 9.36801 10.0115 9.26646 10.0117H1.53413C1.43258 10.0114 1.35031 9.93152 1.35007 9.83285V7.82534C1.35007 7.4631 1.04785 7.16943 0.675037 7.16943C0.302227 7.16943 0 7.4631 0 7.82534V9.83285C0.00099146 10.6557 0.687272 11.3225 1.53413 11.3235H9.26644C10.1133 11.3225 10.7996 10.6557 10.8006 9.83285V7.82534C10.8006 7.4631 10.4984 7.16943 10.1256 7.16943Z" fill="#192546" />
  </Svg>
);

// ─── ShareSheet ───────────────────────────────────────────────────────────────
interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title: string;
  onSubmitResource?: () => void;
}

const ShareSheet = ({visible, onClose, url, title, onSubmitResource}: ShareSheetProps) => {
  const [copied, setCopied] = useState(false);

  const shareTo = async (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    let target = '';

    switch (platform) {
      case 'facebook':
        target = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        target = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'x':
        target = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'whatsapp':
        target = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'email':
        target = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
        break;
      case 'youtube':
        // YouTube has no direct share-compose URL; fall back to native share
        await Share.share({message: `${title} ${url}`, url});
        return;
      default:
        return;
    }

    Linking.openURL(target).catch(() => {
      Share.share({message: `${title} ${url}`, url});
    });
  };

  const handleCopy = () => {
    Clipboard.setString(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenBrowser = () => {
    Linking.openURL(url);
  };

  const platforms = [
    {key: 'facebook', label: 'Facebook', Icon: FacebookIcon},
    {key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon},
    {key: 'x', label: 'X (Twitter)', Icon: XIcon},
    {key: 'youtube', label: 'Youtube', Icon: YouTubeIcon},
    {key: 'whatsapp', label: 'Whatsapp', Icon: WhatsAppIcon},
    {key: 'email', label: 'Email', Icon: EmailIcon},
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{'Share This Article'}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <View style={s.platformRow}>
            {platforms.map(({key, label, Icon}) => (
              <TouchableOpacity
                key={key}
                style={s.platformItem}
                onPress={() => shareTo(key)}
                activeOpacity={0.7}>
                <View style={s.platformIconWrap}>
                  <Icon />
                </View>
                <Text style={s.platformLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.copyRow}>
            <View style={s.copyIconWrap}>
              <CopyLinkIcon />
            </View>
            <View style={s.copyTextWrap}>
              <Text style={s.copyTitle}>{'Copy Link'}</Text>
              <Text style={s.copyUrl} numberOfLines={1}>{url}</Text>
            </View>
            <TouchableOpacity style={s.copyBtn} onPress={handleCopy}>
              <Text style={s.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.linkRow} onPress={handleOpenBrowser}>
            <Text style={s.linkIcon}>{'🔗'}</Text>
            <Text style={s.linkText}>{'Open in Browser'}</Text>
          </TouchableOpacity>

          {onSubmitResource && (
            <TouchableOpacity style={s.linkRow} onPress={onSubmitResource}>
              <UploadArrowIcon />
              <Text style={s.linkText}>{'Submit a Resource'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Share trigger button — used inline on Article detail header ────────────
export const ShareButton = ({onPress, label = 'Share'}: {onPress: () => void; label?: string}) => (
  <TouchableOpacity style={s.shareTriggerBtn} onPress={onPress} activeOpacity={0.85}>
    <Text style={s.shareTriggerText}>{label}</Text>
    <View style={{marginLeft: 10}}>
      <ShareIcon />
    </View>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  title: {fontSize: 17, fontWeight: '700', color: '#0C4D91', fontFamily: 'Runda'},
  closeBtn: {position: 'absolute', right: 0, top: -2},

  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  // Figma: width 60, padding 6, column, gap 6, bg #E8E9F1
  platformItem: {
    width: 60,
    padding: 6,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#E8E9F1',
    borderRadius: 8,
  },
  platformIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma: Body/Body XS — 10px 400 #192546 lineHeight 14
  platformLabel: {
    color: '#192546',
    textAlign: 'center',
    fontFamily: 'Runda',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    marginTop: 6,
  },

  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  copyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  copyTextWrap: {flex: 1},
  copyTitle: {fontSize: 13, fontWeight: '700', color: '#192546', fontFamily: 'Runda'},
  copyUrl: {fontSize: 11, color: '#8F9098', fontFamily: 'Runda'},
  copyBtn: {
    backgroundColor: '#0C4D91',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 10,
  },
  copyBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Runda'},

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  linkIcon: {fontSize: 16, marginRight: 10},
  linkText: {fontSize: 14, color: '#192546', fontWeight: '600', fontFamily: 'Runda'},

  // Share trigger button used on article detail header.
  // Figma: height 41, padding 12 16, radius 5, bg #0C4D91,
  // shadow 0 0 11px -2px rgba(0,0,0,0.15). Using minHeight instead of a
  // fixed height — height + paddingVertical together is a documented
  // anti-pattern in this project (causes text to not render).
  shareTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 41,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: '#0C4D91',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 11,
    elevation: 3,
  },
  shareTriggerText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: 'Runda'},
});

export default ShareSheet;
